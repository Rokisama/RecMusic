from django.core.management.base import BaseCommand
from django.db.models import Count
from recommender.services import POSITIVE_TYPES, NEGATIVE_TYPES, SEQUENCE_ACTIVITIES
from recommender.models import UserActivity
from songs.models import Song
import torch
import math
from tqdm import tqdm
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
from recommender.services import sasrec
from itertools import combinations


def cosine_similarity_np(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)

def personalization_score(all_recs):
    n = len(all_recs)
    if n < 2:
        return 0.0
    overlaps = 0.0
    count = 0
    for i in range(n):
        for j in range(i+1, n):
            a, b = all_recs[i], all_recs[j]
            inter = len(a & b)
            union = len(a | b)
            if union:
                overlaps += inter / union
                count += 1
    return float(1 - overlaps/count) if count else 0.0

class Command(BaseCommand):
    help = """Evaluate SASRec """

    def add_arguments(self, parser):
        parser.add_argument("--k", type=int, default=10, help="Top-K for evaluation")
        parser.add_argument("--n", type=int, default=50, help="Top-N similar songs to target (based on tags)")

    def handle(self, *args, **options):
        K = options["k"]
        N = options["n"]

        total = 0
        topn_hits = 0
        topn_sim_avgs = []
        recommended_items = set()
        all_user_recs = []
        novelty_list = []
        diversity_list = []

        users = UserActivity.objects.values("user_id") \
            .annotate(cnt=Count("id")) \
            .filter(cnt__gte=5)

        track_id_map = {s.track_id: s.id for s in Song.objects.all()}
        song_ids = list(track_id_map.values())
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        sasrec.model.to(device)
        sasrec.model.eval()

        self.stdout.write(f"Evaluating SASRec model on {len(users)} users...")

        tag_df = pd.DataFrame(Song.objects.all().values("id", "tags"))
        tag_df["tags"] = tag_df["tags"].fillna("")
        vectorizer = TfidfVectorizer(
            tokenizer=lambda x: [t.strip().lower() for t in x.split(',') if t.strip()],
            token_pattern=None
        )
        tag_matrix = vectorizer.fit_transform(tag_df["tags"])
        tag_matrix = normalize(tag_matrix, norm="l2")
        tag_vectors = {
            row["id"]: tag_matrix[i].toarray().squeeze()
            for i, row in tag_df.iterrows()
        }

        pop_counts = UserActivity.objects \
            .filter(activity_type__in=SEQUENCE_ACTIVITIES) \
            .values("track_id") \
            .annotate(cnt=Count("id"))
        pop_counter = {}
        total_inter = 0
        for rec in pop_counts:
            tid = rec["track_id"]
            if tid in track_id_map:
                nid = track_id_map[tid]
                cnt = rec["cnt"]
                pop_counter[nid] = cnt
                total_inter += cnt

        eps = 1e-2
        pop_frac = {
            nid: (pop_counter.get(nid, 0) + eps) / (total_inter + eps * len(song_ids))
            for nid in song_ids
        }

        with torch.no_grad():
            for u in tqdm(users, desc="Evaluating users"):
                user_id = u["user_id"]
                activities = UserActivity.objects \
                    .filter(user_id=user_id) \
                    .order_by("timestamp")
                sequence = [
                    track_id_map[a.track_id]
                    for a in activities
                    if a.activity_type in SEQUENCE_ACTIVITIES and a.track_id in track_id_map
                ]

                if len(sequence) < 2:
                    continue

                input_seq = sequence[:-1]
                target_song = sequence[-1]

                input_tensor = torch.tensor([input_seq], dtype=torch.long).to(device)
                item_tensor  = torch.tensor([song_ids], dtype=torch.long).to(device)
                user_tensor  = torch.tensor([user_id], dtype=torch.long).to(device)

                pos_seq = [
                    track_id_map[a.track_id]
                    for a in activities
                    if a.activity_type in POSITIVE_TYPES and a.track_id in track_id_map
                ]
                neg_seq = [
                    track_id_map[a.track_id]
                    for a in activities
                    if a.activity_type in NEGATIVE_TYPES and a.track_id in track_id_map
                ]
                pos_tensor = torch.tensor([pos_seq], dtype=torch.long).to(device)
                neg_tensor = torch.tensor([neg_seq], dtype=torch.long).to(device)

                logits = sasrec.model.predict(
                    user_tensor, input_tensor, item_tensor, pos_tensor, neg_tensor
                )
                ranking = logits[0].argsort(descending=True).tolist()
                top_k = ranking[:K]

                total += 1
                all_user_recs.append(set(top_k))
                recommended_items.update(top_k)

                nov = [1 - pop_frac.get(sid, 0.0) for sid in top_k]
                novelty_list.append(np.mean(nov) if nov else 0.0)

                sims = [
                    cosine_similarity_np(tag_vectors[i], tag_vectors[j])
                    for i, j in combinations(top_k, 2)
                    if i in tag_vectors and j in tag_vectors
                ]
                diversity_list.append(1.0 - np.mean(sims) if sims else 0.0)

                all_sims = [
                    (sid, cosine_similarity_np(tag_vectors[target_song], tag_vectors[sid]))
                    for sid in song_ids
                    if sid != target_song and sid in tag_vectors
                ]
                top_n_similar_sorted = sorted(all_sims, key=lambda x: x[1], reverse=True)[:N]
                topn_ids = {sid for sid, _ in top_n_similar_sorted}
                matched = len(set(top_k) & topn_ids)
                topn_hits += matched
                topn_sim_values = [sim for _, sim in top_n_similar_sorted]
                avg_topn_sim = np.mean(topn_sim_values) if topn_sim_values else 0
                topn_sim_avgs.append(avg_topn_sim)


        if total == 0:
            self.stdout.write("Not enough data to evaluate.")
            return

        personalization = personalization_score(all_user_recs)
        novelty = float(np.mean(novelty_list)) if novelty_list else 0.0
        diversity = float(np.mean(diversity_list)) if diversity_list else 0.0

        self.stdout.write(f"Coverage: {len(recommended_items) / len(song_ids):.4f}")
        self.stdout.write(f"Top-{K} in Top-{N} Tag-Similar Songs: {topn_hits / total:.4f}")
        self.stdout.write(f"Avg Top-{N} Tag-Similarity to Target: {np.mean(topn_sim_avgs):.4f}")
        self.stdout.write(f"Novelty: {novelty:.4f}")
        self.stdout.write(f"Personalization: {personalization:.4f}")
        self.stdout.write(f"Diversity: {diversity:.4f}")
        self.stdout.write("Evaluation results saved to evaluation_tag_similarity_topn.xlsx")
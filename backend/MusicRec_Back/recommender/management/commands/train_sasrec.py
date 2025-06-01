import os
import random
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import DataLoader
import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from django.db.models import Count
from tqdm import tqdm
from songs.models import Song
from recommender.models import UserActivity
from recommender.services import SASRecRecommender, POSITIVE_TYPES, NEGATIVE_TYPES, SEQUENCE_ACTIVITIES, MODEL_PATH
from sklearn.feature_extraction.text import TfidfVectorizer

sasrec = SASRecRecommender()

class SasrecDataset(torch.utils.data.Dataset):
    def __init__(self, data):
        self.data = data

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]

def collate_fn(batch):
    uids, log_seqs, pos_list, neg_list = zip(*batch)
    log_seq_tensors = [torch.tensor(seq, dtype=torch.long) for seq in log_seqs]
    padded_log_seqs = nn.utils.rnn.pad_sequence(log_seq_tensors, batch_first=True, padding_value=0)
    pos_tensor = torch.tensor(pos_list, dtype=torch.long).unsqueeze(1)
    neg_tensor = torch.tensor(neg_list, dtype=torch.long).unsqueeze(1)
    uid_tensor = torch.tensor(uids, dtype=torch.long)
    return uid_tensor, padded_log_seqs, pos_tensor, neg_tensor

class Command(BaseCommand):
    help = "Train SASRec with tag similarity loss."

    def add_arguments(self, parser):
        parser.add_argument('--epochs', type=int, default=1)
        parser.add_argument('--only-new', action='store_true')
        parser.add_argument('--batch_size', type=int, default=32)

    def handle(self, *args, **options):
        EPOCHS = options["epochs"]
        only_new = options["only_new"]
        batch_size = options["batch_size"]
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        model = sasrec.model.to(device)
        model.train()

        track_id_map = {s.track_id: s.id for s in Song.objects.all()}
        song_ids = list(track_id_map.values())

        activities_qs = UserActivity.objects.all().order_by("timestamp").values("user_id", "track_id", "activity_type", "timestamp")
        if only_new:
            activities_qs = activities_qs.filter(trained_on=False)
        df = pd.DataFrame(list(activities_qs))

        user_counts = df['user_id'].value_counts()
        df = df[df['user_id'].isin(user_counts[user_counts >= 5].index)]
        df = df[df['activity_type'].isin(SEQUENCE_ACTIVITIES)]
        df['numeric'] = df['track_id'].map(lambda t: track_id_map.get(t)).dropna().astype(int)

        self.stdout.write("Preparing training and validation data...")
        train_data, valid_data = [], []
        grouped = df.groupby("user_id")
        for uid, group in tqdm(grouped, desc="Preparing training/validation data"):
            sequence = group.sort_values("timestamp")["numeric"].tolist()
            if len(sequence) < 2:
                continue
            for i in range(1, len(sequence)-1):
                log_seq = sequence[:i][-sasrec.args.maxlen:]
                pos = sequence[i]
                neg = random.choice([sid for sid in song_ids if sid != pos])
                train_data.append((uid, log_seq, pos, neg))
            valid_data.append((uid, sequence[:-1][-sasrec.args.maxlen:], sequence[-1]))

        self.stdout.write(f"Prepared {len(train_data)} training samples and {len(valid_data)} validation samples.")

        dataset = SasrecDataset(train_data)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0, collate_fn=collate_fn)

        tag_df = pd.DataFrame(list(Song.objects.all().values("id", "tags")))
        tag_df['tags'] = tag_df['tags'].fillna("")
        vectorizer = TfidfVectorizer(tokenizer=lambda x: [t.strip() for t in x.split(',') if t.strip()], token_pattern=None)
        tag_matrix = vectorizer.fit_transform(tag_df['tags']).toarray()
        tag_vectors = {row['id']: tag_matrix[i] for i, row in tag_df.iterrows()}

        self.stdout.write(f"Loaded tag vectors for {len(tag_vectors)} songs.")

        def get_tag_tensor(ids):
            tag_array = np.array([tag_vectors[i.item()] for i in ids])
            return torch.tensor(tag_array, dtype=torch.float).to(device)

        def cosine_similarity_tensor(a, b):
            return F.cosine_similarity(a, b).mean()

        criterion = nn.BCEWithLogitsLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)
        margin = 0.05
        lambda_triplet = 3.0
        lambda_tag = 3.0

        for epoch in range(EPOCHS):
            epoch_loss = 0
            tag_sim_scores = []
            anchor_pos_sim_scores = []
            anchor_neg_sim_scores = []

            model.train()
            for uid_tensor, log_seq_tensor, pos_tensor, neg_tensor in tqdm(loader, desc=f"Epoch {epoch+1}"):
                uid_tensor = uid_tensor.to(device)
                log_seq_tensor = log_seq_tensor.to(device)
                pos_tensor = pos_tensor.to(device)
                neg_tensor = neg_tensor.to(device)

                pos_logits, neg_logits = model(uid_tensor, log_seq_tensor, pos_tensor, neg_tensor)
                bce_loss = criterion(pos_logits, torch.ones_like(pos_logits)) + \
                           criterion(neg_logits, torch.zeros_like(neg_logits))

                anchor = model.log2feats(log_seq_tensor)[:, -1, :]
                pos_emb = model.item_emb(pos_tensor.squeeze(1))
                neg_emb = model.item_emb(neg_tensor.squeeze(1))

                triplet_loss = F.triplet_margin_loss(anchor, pos_emb, neg_emb, margin=margin, p=2)

                tag_anchor = get_tag_tensor(pos_tensor.squeeze(1))
                tag_neg = get_tag_tensor(neg_tensor.squeeze(1))
                tag_sim_loss = 1 - cosine_similarity_tensor(tag_anchor, tag_neg)
                tag_sim_scores.append(1 - tag_sim_loss.item())

                anchor_pos_sim_scores.append(F.cosine_similarity(anchor, pos_emb).mean().item())
                anchor_neg_sim_scores.append(F.cosine_similarity(anchor, neg_emb).mean().item())

                loss = bce_loss + lambda_triplet * triplet_loss + lambda_tag * tag_sim_loss

                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

            avg_tag_sim = np.mean(tag_sim_scores)
            avg_anchor_pos = np.mean(anchor_pos_sim_scores)
            avg_anchor_neg = np.mean(anchor_neg_sim_scores)

            self.stdout.write(f"Epoch {epoch+1} completed. Loss: {epoch_loss:.4f} | Avg Pos-Neg Tag Cosine: {avg_tag_sim:.4f} | Anchor→Pos: {avg_anchor_pos:.4f} | Anchor→Neg: {avg_anchor_neg:.4f}")

        torch.save(model.state_dict(), MODEL_PATH)
        self.stdout.write("Model saved.")

        if only_new:
            UserActivity.objects.filter(trained_on=False).update(trained_on=True)
            self.stdout.write("Marked used activity as trained.")

import torch
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import normalize
from sklearn.feature_extraction.text import TfidfVectorizer
from recommender.sasrec.model import SASRec
from songs.models import Song
from users.models import CustomUser
from recommender.models import UserActivity

MODEL_PATH = os.path.join(os.path.dirname(__file__), "sasrec/model_weights.pth")

ACTIVITY_PLAY = "play"
ACTIVITY_LIKE = "like"
ACTIVITY_UNLIKE = "unlike"
ACTIVITY_ADD_PLAYLIST = "addPlaylist"
ACTIVITY_REMOVE_PLAYLIST = "removePlaylist"
ACTIVITY_SKIP = "skip"

SEQUENCE_ACTIVITIES = [ACTIVITY_PLAY, ACTIVITY_LIKE, ACTIVITY_ADD_PLAYLIST]
POSITIVE_TYPES = [ACTIVITY_LIKE, ACTIVITY_ADD_PLAYLIST]
NEGATIVE_TYPES = [ACTIVITY_UNLIKE, ACTIVITY_REMOVE_PLAYLIST, ACTIVITY_SKIP]


class Args:
    def __init__(self):
        self.hidden_units = 128
        self.num_heads = 8
        self.num_blocks = 3
        self.dropout_rate = 0.4
        self.maxlen = 100
        self.device = "cuda" if torch.cuda.is_available() else "cpu"


class SASRecRecommender:
    def __init__(self):
        self.num_items = Song.objects.count()
        if self.num_items == 0:
            raise ValueError("No songs in the database.")

        args = Args()
        self.args = args

        song_data = list(Song.objects.all().values("id", "tags"))
        df = pd.DataFrame(song_data)
        df['tags'] = df['tags'].fillna("")

        vectorizer = TfidfVectorizer(
            tokenizer=lambda text: [tag.strip().lower() for tag in text.split(',') if tag.strip()],
            token_pattern=None,
        )
        tag_features = vectorizer.fit_transform(df['tags']).toarray()

        tag_features = normalize(tag_features, norm='l2')

        genre_keywords = ["rock", "pop", "hip_hop", "jazz", "metal", "classical", "electronic", "indie"]
        tag_names = vectorizer.get_feature_names_out()
        genre_indices = [i for i, tag in enumerate(tag_names) if tag in genre_keywords]
        tag_features[:, genre_indices] *= 2.0

        self.combined_feature_tensor = torch.tensor(tag_features, dtype=torch.float)

        self.model = SASRec(
            user_num=CustomUser.objects.count(),
            item_num=self.num_items,
            args=args,
            tag_feature_tensor=self.combined_feature_tensor
        )

        if os.path.exists(MODEL_PATH):
            print("Loading SASRec model...")
            self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.args.device))
            self.model.eval()
        else:
            print("No saved model. Initializing a new one.")
            torch.save(self.model.state_dict(), MODEL_PATH)

    def recommend(self, user_id):
        track_id_map = {s.track_id: s.id for s in Song.objects.all()}
        device = self.args.device

        activities = UserActivity.objects.filter(user_id=user_id).order_by('-timestamp')
        log_seqs = [
            track_id_map[a.track_id]
            for a in activities
            if a.activity_type in SEQUENCE_ACTIVITIES and a.track_id in track_id_map
        ]
        pos_seqs = [
            track_id_map[a.track_id]
            for a in activities
            if a.activity_type in POSITIVE_TYPES and a.track_id in track_id_map
        ]
        neg_seqs = [
            track_id_map[a.track_id]
            for a in activities
            if a.activity_type in NEGATIVE_TYPES and a.track_id in track_id_map
        ]

        if not log_seqs:
            return []

        pos_tensor = torch.tensor([pos_seqs], dtype=torch.long).to(device)
        neg_tensor = torch.tensor([neg_seqs], dtype=torch.long).to(device)
        log_tensor = torch.tensor([log_seqs], dtype=torch.long).to(device)
        item_tensor = torch.tensor([list(track_id_map.values())], dtype=torch.long).to(device)
        user_tensor = torch.tensor([user_id], dtype=torch.long).to(device)

        self.model.to(device)
        self.model.eval()
        with torch.no_grad():
            predictions = self.model.predict(
                user_ids=user_tensor,
                log_seqs=log_tensor,
                item_indices=item_tensor,
                pos_seqs=pos_tensor,
                neg_seqs=neg_tensor
            )

        recommended_ids = predictions.argsort(dim=-1, descending=True)[0][:10].tolist()
        id_to_track = {v: k for k, v in track_id_map.items()}
        return [id_to_track[i] for i in recommended_ids if i in id_to_track]


sasrec = SASRecRecommender()

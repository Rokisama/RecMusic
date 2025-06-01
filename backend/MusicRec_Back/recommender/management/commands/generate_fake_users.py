import random
import datetime
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db.models import Q
from songs.models import Song
from recommender.models import UserActivity

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.neighbors import NearestNeighbors

User = get_user_model()

GENRE_TAGS = {
    "rock": ["rock", "alternative", "grunge"],
    "pop": ["pop", "dance", "funk", "female_vocalists"],
    "rap": ["rap", "hip_hop"],
    "classical": ["classical"],
    "metal": ["metal", "heavy_metal", "death_metal"],
    "edm": ["electronic", "house", "techno", "funk"],
    "indie": ["indie", "chillout", "alternative", "alternative_rock"],
    "punk": ["punk", "emo", "screamo"],
    "blues": ["blues", "jazz", "ambient", "soul"],
}

ARTISTS = [
    "nirvana", "lady gaga", "eminem", "beethoven",
    "metallica", "avicii", "tame impala", "queen",
    "radiohead", "coldplay", "katy perry", "arctic monkeys",
    "linkin park", "ac/dc", "foo fighters", "twenty one pilots",
    "pink floyd", "gorillaz", "shakira", "david guetta", "daft punk"
]

ACTIVITY_TYPES = {
    "play": 0.5,
    "like": 0.2,
    "skip": 0.1,
    "addPlaylist": 0.1,
    "unlike": 0.05,
    "removePlaylist": 0.05,
}


class Command(BaseCommand):
    help = "Generate fake users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--per-type", type=int, default=5,
            help="Users per artist/genre/attribute seed"
        )
        parser.add_argument(
            "--actions", type=int, default=100,
            help="Activities per user"
        )

    def handle(self, *args, **options):
        per_type = options["per_type"]
        actions = options["actions"]
        all_activities = []

        self.stdout.write("Clearing existing users and activities")
        UserActivity.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

        for artist in ARTISTS:
            songs = list(Song.objects.filter(artist__icontains=artist))
            if not songs:
                self.stdout.write(f"No songs found for artist '{artist}'")
                continue
            for i in range(per_type):
                username = f"{artist.lower().replace(' ','')}_fan_{i}"
                user = User(username=username)
                user.set_password("music")
                user.save()
                self.stdout.write(f"Created user: {username}")
                self._generate_activity(user, songs, actions, all_activities)

        for genre, keywords in GENRE_TAGS.items():
            query = Q()
            for kw in keywords:
                query |= Q(tags__icontains=kw)
            songs = list(Song.objects.filter(query))
            if not songs:
                self.stdout.write(f"No songs found for genre '{genre}'")
                continue
            for i in range(per_type):
                username = f"{genre}_lover_{i}"
                user = User(username=username)
                user.set_password("music")
                user.save()
                self.stdout.write(f"Created user: {username}")
                self._generate_activity(user, songs, actions, all_activities)

        all_songs = list(Song.objects.all())
        for i in range(per_type):
            username = f"mixed_user_{i}"
            user = User(username=username)
            user.set_password("music")
            user.save()
            self.stdout.write(f"Created user: {username}")
            self._generate_activity(user, all_songs, actions, all_activities)

        self.stdout.write("Generating attribute-based users")

        attr_cols = ["year", "danceability", "energy", "valence", "tempo"]
        df_attr = pd.DataFrame(
            Song.objects.all().values("id", *attr_cols)
        ).fillna(0)
        mat = df_attr[attr_cols].to_numpy(dtype=float)

        scaler = MinMaxScaler()
        mat_scaled = scaler.fit_transform(mat)

        nn = NearestNeighbors(n_neighbors=actions + 1, metric="cosine")
        nn.fit(mat_scaled)
        dists, idxs = nn.kneighbors(mat_scaled)

        id_list = df_attr["id"].tolist()
        song_map = {s.id: s for s in Song.objects.all()}

        seed_idxs = random.sample(range(len(id_list)), per_type)
        for seed_idx in seed_idxs:
            seed_id = id_list[seed_idx]
            neigh_ids = [ id_list[j] for j in idxs[seed_idx][1:] ]  # skip self
            neigh_songs = [song_map[n] for n in neigh_ids if n in song_map]

            for j in range(per_type):
                username = f"attr_user_{seed_id}_{j}"
                user = User(username=username)
                user.set_password("music")
                user.save()
                self.stdout.write(f"Created attribute user: {username}")
                self._generate_activity(user, neigh_songs, actions, all_activities)

        self.stdout.write(f"Bulk creating {len(all_activities)} user activities…")
        UserActivity.objects.bulk_create(all_activities, batch_size=1000)
        self.stdout.write("Done generating users and activities.")

    def _generate_activity(self, user, songs, total_actions, activity_list):
        types, weights = zip(*ACTIVITY_TYPES.items())
        base = timezone.now() - datetime.timedelta(days=random.randint(30, 365))

        per_session = random.randint(10, 20)
        sessions = total_actions // per_session
        rem = total_actions % per_session

        for _ in range(sessions):
            start = base + datetime.timedelta(hours=random.randint(0, 12))
            for __ in range(per_session):
                song = random.choice(songs)
                act = random.choices(types, weights=weights, k=1)[0]
                ts = start + datetime.timedelta(
                    minutes=random.randint(0, 60),
                    seconds=random.randint(0, 59)
                )
                activity_list.append(UserActivity(
                    user=user,
                    track_id=song.track_id,
                    activity_type=act,
                    timestamp=ts
                ))
            base += datetime.timedelta(hours=random.randint(12, 48))

        if rem:
            start = base + datetime.timedelta(hours=random.randint(0, 12))
            for __ in range(rem):
                song = random.choice(songs)
                act = random.choices(types, weights=weights, k=1)[0]
                ts = start + datetime.timedelta(
                    minutes=random.randint(0, 60),
                    seconds=random.randint(0, 59)
                )
                activity_list.append(UserActivity(
                    user=user,
                    track_id=song.track_id,
                    activity_type=act,
                    timestamp=ts
                ))

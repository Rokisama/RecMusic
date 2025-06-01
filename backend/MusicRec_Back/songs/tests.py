import json
import pytest
from django.urls import reverse
from rest_framework import status
from songs.models import Song, Playlist, LikedSong
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestSongsAndPlaylistViews:
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        self.user = User(username="testuser")
        self.user.set_password("pass")
        self.user.save()

        self.client = api_client
        self.client.force_authenticate(user=self.user)

        self.song1 = Song.objects.create(
            track_id="t1",
            name="First",
            artist="A",
            spotify_preview_url="u1",
            spotify_id="s1",
            tags="",
            year=2021,
            duration_ms=0,
            danceability=0.0,
            energy=0.0,
            key=0.0,
            loudness=0.0,
            mode=0,
            speechiness=0.0,
            acousticness=0.0,
            instrumentalness=0.0,
            liveness=0.0,
            valence=0.0,
            tempo=0.0,
            time_signature=0.0
        )
        self.song2 = Song.objects.create(
            track_id="t2",
            name="Second",
            artist="B",
            spotify_preview_url="u2",
            spotify_id="s2",
            tags="",
            year=2022,
            duration_ms=0,
            danceability=0.0,
            energy=0.0,
            key=0.0,
            loudness=0.0,
            mode=0,
            speechiness=0.0,
            acousticness=0.0,
            instrumentalness=0.0,
            liveness=0.0,
            valence=0.0,
            tempo=0.0,
            time_signature=0.0
        )

        self.playlist = Playlist.objects.create(user=self.user, name="MyList")

    def test_songs_list_requires_auth(self):
        unauth = APIClient()
        resp = unauth.get(reverse('songs'))
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_songs_list(self):
        resp = self.client.get(reverse('songs'))
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        ids = {s['track_id'] for s in data}
        assert {'t1', 't2'} <= ids

    def test_search_songs_empty_query(self):
        resp = self.client.get(reverse('search'))
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "required" in resp.json().get('error', '')

    def test_search_songs_by_name(self):
        url = f"{reverse('search')}?q=first"
        resp = self.client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert len(data) == 1
        assert data[0]['track_id'] == 't1'

    def test_like_and_unlike_song(self):
        resp = self.client.post(reverse('like_song', args=['t1']))
        assert resp.status_code == status.HTTP_201_CREATED
        assert 'liked' in resp.json()['message']

        resp2 = self.client.post(reverse('like_song', args=['t1']))
        assert resp2.status_code == status.HTTP_200_OK

        resp3 = self.client.delete(reverse('unlike_song', args=['t1']))
        assert resp3.status_code == status.HTTP_200_OK

        resp4 = self.client.delete(reverse('unlike_song', args=['t1']))
        assert resp4.status_code == status.HTTP_404_NOT_FOUND

    def test_user_liked_songs_view(self):
        LikedSong.objects.create(user=self.user, song=self.song1)
        LikedSong.objects.create(user=self.user, song=self.song2)
        resp = self.client.get(reverse('liked_songs'))
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        ids = {s['track_id'] for s in data}
        assert ids == {'t1', 't2'}

    def test_playlist_list_and_detail(self):
        resp = self.client.get(reverse('user_playlists'))
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()
        assert isinstance(data, list)
        assert data[0]['name'] == 'MyList'
        pid = data[0]['id']
        resp2 = self.client.get(reverse('single_playlist', args=[pid]))
        assert resp2.status_code == status.HTTP_200_OK
        detail = resp2.json()
        assert detail['id'] == pid

    def test_create_playlist_and_duplicate(self):
        payload = {'name': 'NewList'}
        resp = self.client.post(
            reverse('user_playlists'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert Playlist.objects.filter(name='NewList', user=self.user).exists()

        resp2 = self.client.post(
            reverse('user_playlists'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        assert resp2.status_code == status.HTTP_400_BAD_REQUEST

    def test_add_and_remove_song_in_playlist(self):
        resp = self.client.post(
            reverse('add_song_to_playlist', args=[self.playlist.id, 't2'])
        )
        assert resp.status_code == status.HTTP_200_OK
        assert self.song2 in Playlist.objects.get(id=self.playlist.id).songs.all()

        resp2 = self.client.delete(
            reverse('remove_song_from_playlist', args=[self.playlist.id, 't2'])
        )
        assert resp2.status_code == status.HTTP_200_OK
        assert self.song2 not in Playlist.objects.get(id=self.playlist.id).songs.all()

    def test_delete_playlist(self):
        resp = self.client.delete(
            reverse('delete_playlist', args=[self.playlist.id])
        )
        assert resp.status_code == status.HTTP_200_OK
        assert not Playlist.objects.filter(id=self.playlist.id).exists()

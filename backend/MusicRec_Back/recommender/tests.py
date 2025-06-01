import sys
import types

_dummy_services = types.ModuleType("recommender.services")
_dummy_services.sasrec = types.SimpleNamespace(recommend=lambda user_id: [])
sys.modules["recommender.services"] = _dummy_services

from recommender.services import sasrec as sasrec_module

import types as _types
from django.urls import path
import recommender.views as _views
_test_urls = _types.ModuleType("test_urls")
_test_urls.urlpatterns = [
    path("api/recommender/useractivity/", _views.UserActivityView.as_view(), name="useractivity"),
    path("api/recommender/recommend/",    _views.RecommendedSongsView.as_view(), name="recommend"),
]

sys.modules["test_urls"] = _test_urls

import json
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from songs.models import Song
from recommender.models import UserActivity

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture(autouse=True)
def urls(settings):
    settings.ROOT_URLCONF = "test_urls"

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client, db):

    user = User(username="u1")
    user.set_password("pass")
    user.save()
    api_client.force_authenticate(user=user)
    return api_client

class TestUserActivityAndRecommendations:
    useractivity_url = "/api/recommender/useractivity/"
    recommend_url    = "/api/recommender/recommend/"

    def test_useractivity_requires_auth(self, api_client):
        resp = api_client.post(self.useractivity_url, data="[]", content_type="application/json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_useractivity_invalid_json(self, auth_client):
        resp = auth_client.post(self.useractivity_url, data="not-json", content_type="application/json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.json().get("error") == "Invalid JSON"

    def test_useractivity_missing_logs(self, auth_client):
        resp = auth_client.post(
            self.useractivity_url,
            data=json.dumps({}),
            content_type="application/json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert resp.json().get("error") == "Missing activity_logs"

    def test_useractivity_success(self, auth_client):
        payload = {"activity_logs": [
            {"type": "play", "songId": "s1"},
            {"type": "like", "songId": "s2"}
        ]}
        resp = auth_client.post(
            self.useractivity_url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.json().get("message") == "Activity logged successfully"

        acts = UserActivity.objects.filter(user=auth_client.handler._force_user)
        assert acts.count() == 2
        types = {a.activity_type for a in acts}
        assert types == {"play", "like"}

    def test_recommend_requires_auth(self, api_client):
        resp = api_client.get(self.recommend_url)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_recommend_empty(self, auth_client, monkeypatch):
        monkeypatch.setattr(sasrec_module, 'recommend', lambda uid: [])
        resp = auth_client.get(self.recommend_url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.json().get("recommendations") == []

    def test_recommend_with_songs(self, auth_client, db, monkeypatch):
        s1 = Song.objects.create(
            track_id="x1", name="X", artist="A",
            spotify_preview_url="u1", spotify_id="s1", tags="",
            year=2000, duration_ms=0, danceability=0.0, energy=0.0,
            key=0.0, loudness=0.0, mode=0, speechiness=0.0,
            acousticness=0.0, instrumentalness=0.0, liveness=0.0,
            valence=0.0, tempo=0.0, time_signature=0.0
        )
        s2 = Song.objects.create(
            track_id="x2", name="Y", artist="B",
            spotify_preview_url="u2", spotify_id="s2", tags="",
            year=2001, duration_ms=0, danceability=0.0, energy=0.0,
            key=0.0, loudness=0.0, mode=0, speechiness=0.0,
            acousticness=0.0, instrumentalness=0.0, liveness=0.0,
            valence=0.0, tempo=0.0, time_signature=0.0
        )
        monkeypatch.setattr(sasrec_module, 'recommend', lambda uid: ["x2", "x1"])
        resp = auth_client.get(self.recommend_url)
        assert resp.status_code == status.HTTP_200_OK
        recs = resp.json().get("recommendations")
        assert [song['track_id'] for song in recs] == ["x2", "x1"]

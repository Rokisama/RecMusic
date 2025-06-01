import sys, types, json
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

recommender = types.ModuleType("recommender")
sasrec       = types.ModuleType("recommender.sasrec")
model        = types.ModuleType("recommender.sasrec.model")
urls         = types.ModuleType("recommender.urls")

model.recommend = lambda user_id: []

sasrec.model     = model
recommender.sasrec = sasrec
urls.urlpatterns   = []
sys.modules["recommender"]              = recommender
sys.modules["recommender.sasrec"]       = sasrec
sys.modules["recommender.sasrec.model"] = model
sys.modules["recommender.urls"]         = urls

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client):
    user = User(username="testuser")
    user.set_password("pass")
    user.save()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestAuthViews:
    def test_register_success(self, api_client: APIClient):
        url = reverse("register")
        payload = {
            "username": "newuser",
            "password": "secret123",
            "confirmPassword": "secret123",
        }
        resp = api_client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert resp.status_code == 201
        assert User.objects.filter(username="newuser").exists()

    def test_register_invalid_json(self, api_client: APIClient):
        url = reverse("register")
        resp = api_client.post(url, data="not-json", content_type="application/json")
        assert resp.status_code == 400
        assert resp.json()["error"] == "Invalid JSON"

    def test_register_validation_errors(self, api_client: APIClient):
        url = reverse("register")
        payload = {"username": "", "password": "1234", "confirmPassword": "1234"}
        resp = api_client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert resp.status_code == 400
        errors = resp.json()
        assert "username" in errors
        assert "password" in errors

    def test_login_success(self, api_client: APIClient):
        user = User(username="u")
        user.set_password("pass1234")
        user.save()

        url = reverse("login")
        payload = {"username": "u", "password": "pass1234"}
        resp = api_client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert all(k in data for k in ("refresh", "access", "user"))
        assert data["user"]["username"] == "u"

    def test_login_invalid_credentials(self, api_client: APIClient):
        url = reverse("login")
        payload = {"username": "noexist", "password": "wrong"}
        resp = api_client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert resp.status_code == 401
        assert resp.json()["error"] == "Invalid credentials"

    def test_login_invalid_json(self, api_client: APIClient):
        url = reverse("login")
        resp = api_client.post(url, data="not-json", content_type="application/json")
        assert resp.status_code == 400
        assert resp.json()["error"] == "Invalid JSON"

    def test_profile_requires_auth(self, api_client: APIClient):
        url = reverse("profile")
        resp = api_client.get(url)
        assert resp.status_code == 401

    def test_profile_success(self, auth_client: APIClient):
        url = reverse("profile")
        resp = auth_client.get(url)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert "id" in data

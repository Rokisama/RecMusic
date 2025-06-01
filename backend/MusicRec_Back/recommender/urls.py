from django.urls import path
from .views import UserActivityView, RecommendedSongsView

urlpatterns = [
    path("useractivity/", UserActivityView.as_view(), name="useractivity"),
    path("recommend/", RecommendedSongsView.as_view(), name="recommend"),
]
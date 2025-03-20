from django.urls import path
from .views import UserActivityView

urlpatterns = [
    path("useractivity/", UserActivityView.as_view(), name="useractivity"),

]
from django.contrib import admin
from django.urls import path, include

from Music.views import getSongs


urlpatterns = [
    path('admin/', admin.site.urls),
    path('apis/songs/', getSongs, name="getSongs"),
    path("api/users/", include("users.urls")),
]

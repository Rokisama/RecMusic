from django.urls import path
from .views import SongsView, LikeSongView, UnlikeSongView, UserLikedSongsView, PlaylistView, AddSongToPlaylistView, \
    RemoveSongFromPlaylistView, DeletePlaylistView, SearchSongsView

urlpatterns = [
    path("", SongsView.as_view(), name="songs"),
    path("search/", SearchSongsView.as_view(), name="search"),
    path("like/<str:song_id>/", LikeSongView.as_view(), name="like_song"),
    path("unlike/<str:song_id>/", UnlikeSongView.as_view(), name="unlike_song"),
    path("liked/", UserLikedSongsView.as_view(), name="liked_songs"),
    path("playlists/", PlaylistView.as_view(), name="playlists"),
    path("playlists/<int:playlist_id>/add/<str:song_id>/", AddSongToPlaylistView.as_view(), name="add_song_to_playlist"),
    path("playlists/<int:playlist_id>/remove/<str:song_id>/", RemoveSongFromPlaylistView.as_view(), name="remove_song_from_playlist"),
    path("playlists/<int:playlist_id>/delete/", DeletePlaylistView.as_view(), name="delete_playlist"),
]

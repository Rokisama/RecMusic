from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from songs.models import Song, Playlist, LikedSong
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import SongSerializer, PlaylistSerializer
from django.db.models import Q
from django.db.models.functions import Lower
from rest_framework import status

class SongsView(APIView):
    permission_classes = [IsAuthenticated]

    @csrf_exempt
    def get(self, request):
        songs = Song.objects.all()
        serializer = SongSerializer(songs, many=True)
        return Response(serializer.data)

class SearchSongsView(APIView):
    permission_classes = [IsAuthenticated]

    @csrf_exempt
    def get(self, request):
        query = request.GET.get("q", "").strip()

        if not query:
            return Response({"error": "Query parameter 'q' is required"}, status=400)

        songs = Song.objects.annotate(
            name_lower=Lower("name"),
            artist_lower=Lower("artist")
        ).filter(
            Q(name_lower__icontains=query) | Q(artist_lower__icontains=query)
        )

        serializer = SongSerializer(songs, many=True)
        return Response(serializer.data)

class LikeSongView(APIView):
    permission_classes = [IsAuthenticated]

    @csrf_exempt
    def post(self, request, song_id):
        song = get_object_or_404(Song, track_id=song_id)
        liked_song, created = LikedSong.objects.get_or_create(user=request.user, song=song)

        if created:
            return Response({"message": "Song liked!"}, status=status.HTTP_201_CREATED)
        return Response({"message": "Song already liked!"}, status=status.HTTP_200_OK)

class UnlikeSongView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, song_id):
        song = get_object_or_404(Song, track_id=song_id)
        deleted = LikedSong.objects.filter(user=request.user, song=song).delete()

        if deleted[0]:  # If any row was deleted
            return Response({"message": "Song unliked!"}, status=status.HTTP_200_OK)
        return Response({"message": "Song was not liked!"}, status=status.HTTP_404_NOT_FOUND)

class UserLikedSongsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        liked_songs = LikedSong.objects.filter(user=request.user).select_related("song")
        serializer = SongSerializer([liked_song.song for liked_song in liked_songs], many=True)
        return Response(serializer.data)

class PlaylistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, playlist_id=None):
        if playlist_id is not None:
            playlist = get_object_or_404(Playlist, id=playlist_id, user=request.user)
            serializer = PlaylistSerializer(playlist)
        else:
            playlists = Playlist.objects.filter(user=request.user)
            serializer = PlaylistSerializer(playlists, many=True)

        return Response(serializer.data)


    def post(self, request):
        name = request.data.get("name")

        if Playlist.objects.filter(user=request.user, name=name).exists():
            return Response({"error": "Playlist with this name already exists."}, status=status.HTTP_400_BAD_REQUEST)

        playlist = Playlist.objects.create(user=request.user, name=name)
        return Response({"message": "Playlist created!", "id": playlist.id}, status=status.HTTP_201_CREATED)


class AddSongToPlaylistView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, playlist_id, song_id):
        playlist = get_object_or_404(Playlist, id=playlist_id, user=request.user)
        song = get_object_or_404(Song, track_id=song_id)

        playlist.songs.add(song)
        return Response({"message": "Song added to playlist!"}, status=status.HTTP_200_OK)


class RemoveSongFromPlaylistView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, playlist_id, song_id):
        playlist = get_object_or_404(Playlist, id=playlist_id, user=request.user)
        song = get_object_or_404(Song, track_id=song_id)

        if song in playlist.songs.all():
            playlist.songs.remove(song)
            return Response({"message": "Song removed from playlist!"}, status=status.HTTP_200_OK)

        return Response({"error": "Song not found in playlist."}, status=status.HTTP_404_NOT_FOUND)


class DeletePlaylistView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, playlist_id):
        playlist = get_object_or_404(Playlist, id=playlist_id, user=request.user)
        playlist.delete()
        return Response({"message": "Playlist deleted!"}, status=status.HTTP_200_OK)
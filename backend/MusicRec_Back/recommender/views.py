from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import UserActivity, Song
from .services import sasrec
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from songs.serializers import SongSerializer
import json

class UserActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = json.loads(request.body)
            activity_logs = data.get("activity_logs")

            if not activity_logs:
                return Response({"error": "Missing activity_logs"}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user

            for event in activity_logs:
                track_id = event.get("songId")
                activity_type = event["type"]

                UserActivity.objects.create(
                    user=user,
                    track_id=track_id,
                    activity_type=activity_type
                )

            return Response({"message": "Activity logged successfully"}, status=status.HTTP_201_CREATED)

        except json.JSONDecodeError:
            return Response({"error": "Invalid JSON"}, status=status.HTTP_400_BAD_REQUEST)


class RecommendedSongsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id

        rec_track_ids = sasrec.recommend(user_id)

        if not rec_track_ids:
            return Response({"recommendations": []})

        qs = Song.objects.filter(track_id__in=rec_track_ids)
        songs_in_order = sorted(qs, key=lambda s: rec_track_ids.index(s.track_id))
        serializer = SongSerializer(songs_in_order, many=True)
        return Response({"recommendations": serializer.data})


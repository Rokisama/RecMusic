import csv
from django.core.management.base import BaseCommand
from songs.models import Song

class Command(BaseCommand):
    help = "Import songs from a CSV file into the database"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to the CSV file")

    def handle(self, *args, **options):
        csv_file_path = options["csv_file"]

        with open(csv_file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile, skipinitialspace=True)
            reader.fieldnames[0] = reader.fieldnames[0].lstrip("\ufeff")

            # ✅ Debug: Print detected headers
            print("CSV Headers:", reader.fieldnames)

            for row in reader:
                print(row)  # Print first row to debug
                break

            songs_to_create = []
            for row in reader:
                song = Song(
                    track_id=row["track_id"],
                    name=row["name"],
                    artist=row["artist"],
                    spotify_preview_url=row["spotify_preview_url"],
                    spotify_id=row["spotify_id"],
                    tags=row["tags"],
                    year=int(row["year"]),
                    duration_ms=int(row["duration_ms"]),
                    danceability=float(row["danceability"]),
                    energy=float(row["energy"]),
                    key=int(row["key"]),
                    loudness=float(row["loudness"]),
                    mode=int(row["mode"]),
                    speechiness=float(row["speechiness"]),
                    acousticness=float(row["acousticness"]),
                    instrumentalness=float(row["instrumentalness"]),
                    liveness=float(row["liveness"]),
                    valence=float(row["valence"]),
                    tempo=float(row["tempo"]),
                    time_signature=int(row["time_signature"]),
                )
                songs_to_create.append(song)

            Song.objects.bulk_create(songs_to_create)
            self.stdout.write(self.style.SUCCESS(f"Successfully imported {len(songs_to_create)} songs!"))

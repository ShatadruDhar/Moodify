# Moodify

Moodify is a mood-based music web app. The React frontend uses the camera to
detect a facial expression and requests a matching song from the Express API.
User accounts and song metadata are stored in MongoDB; Redis is used by the
authentication flow. Song uploads use ImageKit.

## Run with Docker

### Requirements

- Docker Desktop (or Docker Engine) with the Docker Compose plugin
- An ImageKit private key only if you need to upload songs

### Start the stack

From the repository root:

```sh
cp .env.example .env
```

On PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Edit `.env` before starting:

- Set `JWT_SECRET` to a unique secret.
- Set `IMAGEKIT_PRIVATE_KEY` if you need the song-upload endpoint.
- Leave `MONGO_URI`, `REDIS_HOST`, and `REDIS_PORT` at their defaults to use
  the MongoDB and Redis containers.

Build and start all services:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The frontend container
serves the built React app and forwards `/api` requests to the backend. MongoDB
and Redis data are stored in named Docker volumes and persist across container
restarts.

Useful commands:

```sh
docker compose logs -f
docker compose ps
docker compose down
```

## Local development

Install dependencies in both application folders:

```sh
cd Backend
npm ci
cd ../Frontend
npm ci
```

Configure the backend environment in `Backend/.env` with the variables listed
below. Set `FRONTEND_URL=http://localhost:5173`, then start each app in a
separate terminal:

```sh
# Terminal 1
cd Backend
npm run dev
```

```sh
# Terminal 2
cd Frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api`
requests to `http://localhost:3000`.

### Use a local-only song folder

Moodify can select and play tracks directly from a local MP3 folder without
uploading or copying the audio. The API binds to `127.0.0.1` when this mode is
enabled, so this library is only served from the same computer.

The local mood manifest is ignored by Git. Generate an initial, heuristic
mood draft from a folder of MP3s with Python, `ffmpeg`, `ffprobe`, `librosa`,
and `numpy` installed:

```powershell
python Backend\scripts\analyze-local-songs.py "C:\path\to\your\mp3s"
```

This writes `Backend\local-songs.json` and does not alter the MP3 files. Its
mood assignments are based on relative tempo, energy, and brightness—not
semantic understanding—and should be reviewed in the JSON before using them.
Change any song's `mood` to `happy`, `sad`, or `surprised` as needed.

Then start the API with the local library path configured:

```powershell
$env:LOCAL_SONGS_DIR = "C:\path\to\your\mp3s"
Set-Location Backend
npm run dev
```

In another terminal, start the frontend as described above and open
[http://localhost:5173](http://localhost:5173). Sign in as usual; account
authentication still uses the MongoDB and Redis settings in `Backend\.env`.
When the detector returns a mood, `/api/songs` picks a random matching entry
from the local manifest and streams its MP3 and embedded cover art from the
API. Without `LOCAL_SONGS_DIR`, the API continues to select from MongoDB.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | Yes | Signs and verifies authentication tokens. Use a unique secret. |
| `MONGO_URI` | Yes | MongoDB connection URI. |
| `REDIS_HOST` | Yes | Redis hostname. Use `redis` in Compose. |
| `REDIS_PORT` | Yes | Redis port, usually `6379`. |
| `REDIS_PASSWORD` | Yes | Redis password; must match the Redis service configuration. |
| `FRONTEND_URL` | Yes | Allowed frontend origin for API CORS. |
| `IMAGEKIT_PRIVATE_KEY` | For uploads | ImageKit private key used by the song upload endpoint. |
| `PORT` | No | API port; defaults to `3000`. |
| `NODE_ENV` | No | Set to `production` when served over HTTPS so auth cookies are secure. |

Never commit `.env` files or put production credentials in an image. For
production, replace the local Compose credentials, use managed or secured
MongoDB/Redis services, and terminate HTTPS at a trusted reverse proxy.

## Project layout

```text
Backend/    Express API, authentication, MongoDB and Redis integrations
Frontend/   React + Vite web application
compose.yaml
```

## Checks

Run the frontend production build and lint:

```sh
cd Frontend
npm run build
npm run lint
```

The face detector uses the pinned MediaPipe Tasks Vision `0.10.32` runtime
and Face Landmarker model version `1`, served from
`Frontend/public/mediapipe/0.10.32/`; these assets are self-hosted, so camera
detection does not fetch the runtime or model from a third-party CDN at page
load. The model is pinned from the MediaPipe Face Landmarker version 1 asset.

## Seed song data

The API selects a random song from MongoDB for each supported mood (`happy`,
`sad`, and `surprised`). To seed it, provide an approved JSON file containing
5–10 songs per mood. Each entry must have a unique HTTPS audio `url`, an HTTPS
`posterUrl`, a `title`, and one of the supported moods:

```json
[
  {
    "title": "Licensed track title",
    "url": "https://your-approved-host.example/song.mp3",
    "posterUrl": "https://your-approved-host.example/poster.jpg",
    "mood": "happy"
  }
]
```

Repeat the entry shape for at least five and at most ten different tracks in
each mood before running the seeder.

Save the data outside version control when it contains private URLs, then run:

```sh
cd Backend
npm run seed:songs -- path/to/songs.json
```

The importer validates mood counts, titles, duplicate audio URLs, and HTTPS
URLs before connecting to MongoDB.

With Docker Compose, copy the JSON file into the running API container and run
the importer there so it can reach the Compose MongoDB service:

```sh
docker cp ./songs.json "$(docker compose ps -q backend):/tmp/songs.json"
docker compose exec backend npm run seed:songs -- /tmp/songs.json
```

PowerShell equivalent:

```powershell
$backendContainer = docker compose ps -q backend
docker cp .\songs.json "${backendContainer}:/tmp/songs.json"
docker compose exec backend npm run seed:songs -- /tmp/songs.json
```

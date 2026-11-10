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

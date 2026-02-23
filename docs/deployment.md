# Deployment

Deploy the API to a server via SSH using GitHub Actions.

## Prerequisites

- Docker installed on the server
- Git repo cloned at the deploy path
- `.env` file configured on the server
- VPN access to the server (if not public)

## GitHub Actions Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Example | Description |
|--------|---------|-------------|
| `SSH_HOST` | `192.168.1.100` or `pelonis` | Server hostname or IP |
| `SSH_USER` | `pelonis` | SSH username |
| `SSH_KEY` | *(see below)* | Private SSH key (full PEM content) |
| `SSH_PORT` | `22` | SSH port (defaults to 22) |
| `DEPLOY_PATH` | `/home/pelonis/files-converter-api` | Absolute path to the project on the server |

### SSH_KEY

Paste the **entire private key** including headers:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA...
...
-----END OPENSSH PRIVATE KEY-----
```

To generate a deploy key:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/deploy_key

# Copy the public key to the server
ssh-copy-id -i ~/.ssh/deploy_key.pub pelonis@pelonis

# Copy the private key content — paste this into GitHub Secrets as SSH_KEY
cat ~/.ssh/deploy_key
```

## Server Setup (One-Time)

```bash
# SSH into the server
ssh pelonis@pelonis

# Clone the repo
git clone https://github.com/1devspace/files-converter-api.git /home/pelonis/files-converter-api
cd /home/pelonis/files-converter-api

# Create the .env file
cat > .env << 'EOF'
PORT=4001
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/files-converter
BETTER_AUTH_SECRET=your-secret-here
BASE_URL=https://converter.pelonis.seneca.center
API_URL=https://api.converter.pelonis.seneca.center
AUTH_TRUSTED_ORIGINS=https://converter.pelonis.seneca.center
FRONTEND_LOGIN_URL=https://converter.pelonis.seneca.center/login
EOF
```

## Workflow

Two GitHub Actions workflows handle release and deployment:

### 1. Release (`release.yml`)

- **Trigger**: Push to `main` or manual dispatch
- **Steps**: Extracts version from `package.json`, generates a changelog from conventional commits, creates a GitHub Release with tag

### 2. Deploy (`deploy.yml`)

- **Trigger**: New release published or manual dispatch
- **Steps**: SSHs into the server, pulls latest code, builds Docker image, restarts container

### Deploy Flow

```
bun run release  →  push tag  →  Release workflow  →  GitHub Release  →  Deploy workflow  →  SSH + Docker
```

## Docker Container

The deploy workflow runs the following on the server:

```bash
docker build -t files-converter-api .
docker stop files-converter-api 2>/dev/null || true
docker rm files-converter-api 2>/dev/null || true
docker run -d \
  --name files-converter-api \
  --restart unless-stopped \
  -p 4001:4001 \
  --env-file /home/pelonis/files-converter-api/.env \
  files-converter-api
```

## Port Mapping

| Service | Port |
|---------|------|
| API (backend) | 4001 |
| Frontend | 4000 |

## Domain

| URL | Service |
|-----|---------|
| `api.converter.pelonis.seneca.center` | Backend API |
| `converter.pelonis.seneca.center` | Frontend |

## Updating Environment Variables

Edit the `.env` file on the server and restart the container:

```bash
ssh pelonis@pelonis
nano /home/pelonis/files-converter-api/.env
docker restart files-converter-api
```

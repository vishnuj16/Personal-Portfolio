#!/bin/bash
set -e

VM_USER="vishnuj016"
VM_INSTANCE="portfolio"
ZONE="us-west1-a"
TARGET_DIR="/home/vishnuj016/portfolio"

LOCAL_BACKEND="/home/vishnuj16/Documents/Portfolio/Personal-Portfolio/backend"
LOCAL_FRONTEND="/home/vishnuj16/Documents/Portfolio/Personal-Portfolio/portfolio"

# 1. Build Backend Binary locally
echo "⚙️ Compiling Go backend for Linux production..."
cd "$LOCAL_BACKEND"
GOOS=linux GOARCH=amd64 go build -o ./server ./cmd/main.go

# 2. Build Frontend Distribution locally
echo "📦 Compiling React production bundle..."
cd "$LOCAL_FRONTEND"
npm run build

# 3. Stop the remote service first to release the file lock
echo "🛑 Temporarily stopping the remote portfolio service..."
gcloud compute ssh ${VM_USER}@${VM_INSTANCE} --zone=$ZONE --command="sudo systemctl stop portfolio"

# 4. Upload Backend Binary
echo "🚀 Uploading Go binary executable..."
gcloud compute scp "$LOCAL_BACKEND/server" ${VM_USER}@${VM_INSTANCE}:${TARGET_DIR}/ --zone=$ZONE

# 5. Upload Frontend Dist static assets (recursively to the nested portfolio folder)
echo "🚀 Uploading static frontend bundles..."
gcloud compute scp --recurse "$LOCAL_FRONTEND/dist" ${VM_USER}@${VM_INSTANCE}:${TARGET_DIR}/ --zone=$ZONE

# 6. Restart the server and verify status via SSH commands automatically
echo "🔄 Restarting application service on VM..."
gcloud compute ssh ${VM_USER}@${VM_INSTANCE} --zone=$ZONE --command="
    sudo systemctl start portfolio
    echo '📊 Service Status Tracker:'
    sudo systemctl status portfolio --no-pager
"

echo "✅ Deployment completed successfully!"
#!/bin/sh

echo "========== STARTING ARGO TUNNEL AGENT =========="

# 1. Download binary cloudflared resmi versi Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /tmp/cloudflared
chmod +x /tmp/cloudflared

# 2. Cek apakah variable ARGO_TUNNEL di Railway ada isinya
if [ -n "$ARGO_TUNNEL" ]; then
  echo "[CF] Token terdeteksi! Menyambungkan ke domain sendiri via Cloudflare Tunnel..."
  /tmp/cloudflared tunnel --no-autoupdate run --token "$ARGO_TUNNEL" &
else
  echo "[CF] Token kosong! Menggunakan terowongan cepat gratisan (Quick Tunnel)..."
  /tmp/cloudflared tunnel --url http://localhost:${PORT:-8080} &
fi

echo "========== STARTING GATEWAY SERVER.JS =========="
# 3. Jalankan server utama lu tanpa gangguan
exec node server.js

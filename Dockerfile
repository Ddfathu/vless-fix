FROM node:18-alpine

# Install wget dan libc6-compat agar binary cloudflared bisa jalan tanpa error
RUN apk add --no-cache wget libc6-compat

WORKDIR /app

# Salin file package json untuk install modul ws
COPY package*.json ./
RUN npm install --production

# Salin seluruh sisa file script ke dalam container
COPY . .

# Beri akses eksekusi ke file script shell argo
RUN chmod +x entrypoint.sh

# Eksekusi server via entrypoint
ENTRYPOINT ["./entrypoint.sh"]

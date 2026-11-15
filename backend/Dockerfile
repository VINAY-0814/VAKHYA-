FROM node:20-bookworm-slim

WORKDIR /app

# System dependencies required for Mediasoup C++ worker build and FFmpeg RTP media pipeline
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    build-essential \
    ffmpeg \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000
EXPOSE 40000-40100/udp

CMD ["sh", "-c", "npm run migrate && npm run dev"]

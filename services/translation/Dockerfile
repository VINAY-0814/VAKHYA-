FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsndfile1 \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000 9001 9002

ENV PYTHONPATH=/app
ENV TRANSLATION_HTTP_PORT=8000
ENV V2S_TCP_PORT=9001
ENV S2V_TCP_PORT=9002

CMD ["python3", "-m", "app.server"]

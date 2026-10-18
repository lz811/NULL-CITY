FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3-pil && rm -rf /var/lib/apt/lists/*
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN useradd --uid 10001 --create-home nullcity && mkdir -p /app/data && chown nullcity /app/data
COPY --chown=nullcity:nullcity server ./server
COPY --chown=nullcity:nullcity src ./src
COPY --chown=nullcity:nullcity assets ./assets
COPY --chown=nullcity:nullcity index.html hub.html privacy.html terms.html ./
COPY --chown=nullcity:nullcity deploy ./deploy
RUN chmod +x deploy/entrypoint.sh
USER nullcity
EXPOSE 8443
ENTRYPOINT ["/bin/sh", "/app/deploy/entrypoint.sh"]

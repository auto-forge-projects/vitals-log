# SEC-11: sabit taban imaj, non-root kullanici, calisma zamani bagimliligi sifir (npm install yok).
FROM node:22-alpine

ENV TZ=Europe/Istanbul \
    NODE_ENV=production \
    PORT=3000 \
    VITALS_DB=/app/data/vitals.db

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public

RUN mkdir -p /app/data \
    && addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

USER app
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]

# Image de production : dépendances figées par package-lock.json, utilisateur non-root.
# Le runtime ne garde ni npm ni corepack : l'API démarre directement avec node,
# ce qui réduit la surface d'attaque et les alertes Trivy sur les outils de build.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
RUN apk upgrade --no-cache \
    && addgroup -S app \
    && adduser -S -G app app \
    && rm -rf /usr/local/lib/node_modules/npm \
       /usr/local/lib/node_modules/corepack \
       /usr/local/bin/npm \
       /usr/local/bin/npx \
       /usr/local/bin/corepack
COPY --chown=app:app package.json ./
COPY --chown=app:app --from=deps /app/node_modules ./node_modules
COPY --chown=app:app src ./src
COPY --chown=app:app public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "src/server.js"]

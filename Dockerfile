# Image de production : dépendances figées par package-lock.json, utilisateur non-root.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --chown=app:app package.json ./
COPY --chown=app:app --from=deps /app/node_modules ./node_modules
COPY --chown=app:app src ./src
COPY --chown=app:app public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["npm", "start"]

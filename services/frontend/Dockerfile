FROM node:lts-slim AS base

FROM base AS deps
WORKDIR /app
COPY services/frontend/package.json services/frontend/package-lock.json* ./
RUN npm install

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://flipflop.alfares.cz/api
ARG API_URL=http://flipflop-service:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV API_URL=${API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY services/frontend ./
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://flipflop-service:3000/api
ENV NEXT_PUBLIC_API_URL=https://flipflop.alfares.cz/api

RUN apt-get update -y && apt-get install -y curl tini && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

FROM node:24-slim

WORKDIR /app

# Install OpenSSL required by Prisma client binary
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy shared module first (required by package-lock.json symlink resolution)
COPY shared ./shared
RUN cd /app/shared && npm install --legacy-peer-deps --no-package-lock

# Install service dependencies
COPY services/api-gateway/package*.json ./
RUN npm install --legacy-peer-deps --no-package-lock

# Install prisma CLI + client so generate can run from /app (schema resolution)
RUN npm install --no-save --legacy-peer-deps --no-package-lock prisma@5.22.0 @prisma/client@5.22.0

# Generate Prisma client and sync to shared/node_modules (where shared/dist resolves it)
COPY prisma ./prisma
RUN cd /app/shared && /app/node_modules/.bin/prisma generate --schema=/app/prisma/schema.prisma && \
    mkdir -p /app/shared/node_modules/@prisma && \
    rm -rf /app/shared/node_modules/@prisma/client /app/shared/node_modules/.prisma && \
    cp -r /app/node_modules/@prisma/client /app/shared/node_modules/@prisma/client && \
    cp -r /app/node_modules/.prisma /app/shared/node_modules/.prisma && \
    npm run build

# Build dist from source INSIDE the image.
#
# This previously did `COPY services/api-gateway/dist ./dist`, described as
# "pre-built dist (already compiled in repo)" -- but dist/ is gitignored, so
# nothing was in the repo and the build copied whatever happened to sit on the
# building machine. On 2026-09-10 that shipped a months-old reporter reading
# NOTIFICATION_SERVICE_TOKEN while the source had long moved to
# MONITORING_INGEST_SERVICE_TOKEN, so a healthy pod logged a missing-credential
# error every 30 minutes and the deploy reported success.
# @flipflop/shared must resolve BEFORE the gateway is compiled: tsc fails with
# TS2307 on every import otherwise.
RUN mkdir -p /app/node_modules/@flipflop && ln -sf /app/shared /app/node_modules/@flipflop/shared

# The service tsconfig extends ../../tsconfig.json and maps @flipflop/shared to
# ../../shared, so the gateway is compiled at services/api-gateway/ inside the
# image to keep those relative paths valid, then dist is moved to /app/dist.
COPY tsconfig.json /tsconfig.json
COPY services/api-gateway/tsconfig.json /services/api-gateway/tsconfig.json
COPY services/api-gateway/src /services/api-gateway/src
RUN ln -sfn /app/node_modules /services/api-gateway/node_modules && \
    ln -sfn /app/shared /shared_pkg && \
    cd /services/api-gateway && \
    /app/node_modules/.bin/tsc --types node && \
    /app/node_modules/.bin/tsc-alias && \
    mkdir -p /services/api-gateway/dist/health/vendor && \
    cp /services/api-gateway/src/health/vendor/credential-reporter.js \
       /services/api-gateway/dist/health/vendor/ && \
    cp -r /services/api-gateway/dist /app/dist

# Fail the build if the compiled output is missing rather than shipping an
# image whose entrypoint does not exist.
RUN test -f /app/dist/main.js || (echo 'BUILD FAILED: dist/main.js not produced' && exit 1)
# The vendored reporter is copied by package.json's postbuild, which a direct
# tsc call bypasses. Without it the pod throws MODULE_NOT_FOUND at boot -- the
# failure that crashlooped invoices-microservice on 2026-09-03 and this image
# on 2026-09-10. Assert it rather than discovering it in a CrashLoopBackOff.
RUN test -f /app/dist/health/vendor/credential-reporter.js || \
    (echo 'BUILD FAILED: vendored credential-reporter.js missing from dist' && exit 1)


# Set shared runtime modules on the Node resolution path
ENV NODE_PATH=/app/shared/node_modules:/app/node_modules

# dist files compiled with ../../../../shared path — create symlink at /shared
RUN ln -sf /app/shared /shared

EXPOSE 3000

CMD ["sh", "-c", "if [ -f dist/main.js ]; then exec node dist/main.js; fi; exec node dist/services/api-gateway/src/main.js"]

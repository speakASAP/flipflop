FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/order-service/package.json ./services/order-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/order-service ./services/order-service
COPY prisma ./prisma
COPY tsconfig.json ./

# Install shared module dependencies first
WORKDIR /app/shared
RUN npm install --legacy-peer-deps

# Generate Prisma Client (needed for AdminSettings type)
WORKDIR /app
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build shared module
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/order-service
RUN npm run build

# Expose port
EXPOSE 3003

# Start service
CMD ["node", "dist/main.js"]


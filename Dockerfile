# ----- Builder Stage -----
FROM node:22-slim AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Remove devDependencies to optimize image size
RUN npm prune --production

# ----- Runner Stage -----
FROM node:22-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Use non-root user for better security
RUN chown -R node:node /app
USER node

# Copy production artifacts and dependencies
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Expose port (default 3000)
EXPOSE 3000

# Start server directly with Node for proper signal handling
CMD ["node", "dist/server.cjs"]

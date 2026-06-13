# syntax = docker/dockerfile:1
# Field Events Live is NOT a static SPA — it's an Express + WebSocket server
# that also serves the built frontend. So the image runs Node, not nginx.

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim

LABEL fly_launch_runtime="Node.js + Express"
WORKDIR /app
ENV NODE_ENV="production"

# Install deps (incl. dev deps — Vite is needed for the build step).
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy app code and build the frontend into dist/ (served by the server).
COPY . .
RUN npm run build

# The server serves dist/ + the API + the WebSocket on 8080 (matches
# fly.toml internal_port). Fly's proxy connects there.
ENV PORT=8080
ENV HOST=0.0.0.0
EXPOSE 8080
CMD ["node", "server/index.js"]

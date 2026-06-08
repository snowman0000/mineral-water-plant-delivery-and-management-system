# Stage 1: Build the frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend Node service and bundle assets
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ ./backend/
# Copy the compiled frontend build output to backend/public for static serving
COPY --from=frontend-builder /app/frontend/dist ./backend/public

EXPOSE 5000
WORKDIR /app/backend
CMD ["node", "src/app.js"]

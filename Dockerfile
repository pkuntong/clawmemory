# ClawMemory Docker Setup

FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Development stage
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 5173 3210
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

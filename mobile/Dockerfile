# Stage 1: Build the Expo web export
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Export the Expo app as a static web build
RUN npx expo export --platform web

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine already ships with a non-root 'nginx' user (uid 101, gid 101).
# Do NOT call addgroup/adduser — 'nginx' already exists and re-creating it
# exits with error code 1, breaking the build.
# Just set ownership on the paths the nginx worker process writes to.
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

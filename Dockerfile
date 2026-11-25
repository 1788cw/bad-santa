# Stage 1: Verify game engine, vector icons, and jazz charts
FROM node:22-alpine AS test
WORKDIR /src
COPY package.json engine.js icons.js jazz-charts.js jazz-engine.js music.js ./
COPY test ./test
RUN node --test test/*.test.js

# Stage 2: Serve static browser app via lightweight Nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY index.html styles.css icons.js engine.js jazz-charts.js jazz-engine.js sound.js music.js app.js /usr/share/nginx/html/
COPY fonts /usr/share/nginx/html/fonts
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

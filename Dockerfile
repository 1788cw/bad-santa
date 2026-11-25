# Stage 1: Verify game engine & vector icon tests
FROM node:22-alpine AS test
WORKDIR /src
COPY package.json engine.js icons.js ./
COPY test ./test
RUN node --test test/*.test.js

# Stage 2: Serve static browser app via lightweight Nginx
FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY index.html styles.css icons.js engine.js sound.js app.js /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

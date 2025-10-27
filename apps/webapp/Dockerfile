FROM node:20 AS builder

WORKDIR /app

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .

RUN npm run build -- --configuration production


FROM nginx:latest

RUN rm -rf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend-mimoq/browser /usr/share/nginx/html

COPY --from=builder /app/nginx/nginx.conf /etc/nginx/conf.d/default.conf


EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

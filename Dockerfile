FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec expo export --platform web


FROM nginx:1.27-alpine

RUN apk update && apk upgrade && apk add --no-cache libssl3=3.3.7-r1 libcrypto3=3.3.7-r1

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
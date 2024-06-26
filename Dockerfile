FROM node:20-slim

RUN apt update && apt install --no-install-recommends -y build-essential

WORKDIR /app

COPY . .

RUN npm ci

# Using the 1000:1000 user is recommended for VSCode dev containers
# https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user
USER node

ENV FILE=""
ENV COUCH_URL=""

ENTRYPOINT npm run generate test-data/$FILE

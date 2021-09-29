FROM node:16-alpine as base
# FROM node:16 as base

# for debian:
# RUN apt-get update && apt-get install -y jq

# for alpine:
RUN apk add jq

# Create the directory!
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# Copy and Install our bot
COPY package.json /usr/src/bot

# Our precious bot
COPY . /usr/src/bot

FROM base as test
# for alpine:
RUN apk add python3 git git-lfs && python3 -m ensurepip && pip3 install pre-commit

# for debian:
# RUN apt-get install -y git git-lfs python3 python-pip && pip install pre-commit

RUN npm ci
RUN npm run test -- --verbose --testPathIgnorePatterns roll.test.js
# workaround for linux node bug --> https://github.com/nodejs/node/issues/35889
RUN npm run test roll.test.js -- --verbose

# Start me!
# CMD ["node", "index.js"]
FROM base as prod
RUN npm ci --production --ignore-scripts
CMD CONFIGDIR=/config node .
HEALTHCHECK --start-period=3m --interval=30s --timeout=5s CMD /usr/bin/curl --cookie-jar healthcheck-cookiejar.txt   --cookie healthcheck-cookiejar.txt --insecure --fail --silent http://localhost:`jq -r '.httpServerPort' /config/config.json`/health || exit 1

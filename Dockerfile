FROM node:16 as base

# for debian:
RUN apt-get update && apt-get install -y jq python3 git git-lfs python-pip
RUN pip install pre-commit

# for alpine:
# RUN apk add jq python3 git git-lfs
# RUN python3 -m ensurepip && pip3 install pre-commit

# Create the directory!
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# Copy and Install our bot
COPY package.json /usr/src/bot

# Our precious bot
COPY . /usr/src/bot

FROM base as test
RUN npm ci
RUN npm run test --verbose

# Start me!
# CMD ["node", "index.js"]
FROM base as prod
RUN npm ci --production
CMD CONFIGDIR=/config node .
HEALTHCHECK --start-period=3m --interval=30s --timeout=5s CMD /usr/bin/curl --cookie-jar healthcheck-cookiejar.txt   --cookie healthcheck-cookiejar.txt --insecure --fail --silent http://localhost:`jq -r '.httpServerPort' /config/config.json`/health || exit 1

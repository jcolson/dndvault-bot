FROM node:16-alpine as base

# Install jq for healthcheck
# RUN apt-get update && apt-get install -y jq
RUN apk add jq
RUN apk add python3 git git-lfs
RUN python3 -m ensurepip
RUN pip3 install pre-commit

# Create the directory!
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# Copy and Install our bot
COPY package.json /usr/src/bot

# Our precious bot
COPY . /usr/src/bot

FROM base as test
RUN npm ci
RUN npm run test

# Start me!
# CMD ["node", "index.js"]
FROM base as prod
RUN npm ci --production
CMD CONFIGDIR=/config node .
HEALTHCHECK --start-period=3m --interval=30s --timeout=5s CMD /usr/bin/curl --cookie-jar healthcheck-cookiejar.txt   --cookie healthcheck-cookiejar.txt --insecure --fail --silent http://localhost:`jq -r '.httpServerPort' /config/config.json`/health || exit 1

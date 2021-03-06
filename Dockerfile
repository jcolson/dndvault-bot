FROM node:15.14.0 as base

# Create the directory!
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# Copy and Install our bot
COPY package.json /usr/src/bot
#RUN npm install

# Our precious bot
COPY . /usr/src/bot

FROM base as test
RUN npm ci
RUN npm run test __test__

# Start me!
# CMD ["node", "index.js"]
FROM base as prod
# Install jq for healthcheck
RUN apt-get update && apt-get install -y jq

RUN npm ci --production
CMD CONFIGDIR=/config node .
HEALTHCHECK --start-period=3m --interval=30s --timeout=5s CMD /usr/bin/curl --cookie-jar healthcheck-cookiejar.txt   --cookie healthcheck-cookiejar.txt --insecure --fail --silent http://localhost:`jq -r '.httpServerPort' /config/config.json`/health || exit 1

FROM alpine:3.12.3

COPY index.js /
COPY package.json /
COPY package-lock.json /
COPY models /models

RUN apk add nodejs
RUN apk add npm
RUN apk add git
RUN npm install

#HEALTHCHECK CMD wget --quiet --tries=1 --spider http://localhost:8080/metrics || exit 1

CMD CONFIGDIR=/config /index.js

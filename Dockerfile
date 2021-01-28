FROM node:12.14.1-alpine3.10

ADD . /doorman

WORKDIR /doorman

RUN rm -rf node_modules && yarn install --frozen-lockfile

ENTRYPOINT ["node", "app.js"]

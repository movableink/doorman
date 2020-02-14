FROM node:12.14.1-alpine3.10

ADD . /doorman

WORKDIR /doorman

RUN rm -rf node_modules && yarn

ENTRYPOINT ["node", "app.js"]

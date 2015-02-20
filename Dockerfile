FROM odise/busybox-node

ADD . /doorman
WORKDIR /doorman

RUN npm install
EXPOSE 8085

CMD [ "node", "app.js" ]

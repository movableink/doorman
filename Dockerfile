FROM node:0.10-onbuild
ADD conf.example.js /usr/src/app/conf.js
EXPOSE 8085

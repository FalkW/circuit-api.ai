FROM node:8

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

#ONBUILD COPY package.json /usr/src/app/package.json
#ONBUILD RUN npm install
#ONBUILD COPY . /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app

EXPOSE 8080

CMD [ "npm", "start" ]


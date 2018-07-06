FROM debian:8.0
RUN apt-get update \
    && apt-get install -y curl \
    && curl -sL https://deb.nodesource.com/setup_8.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && npm install -g npm@6.1

ENV PORT 80
ENTRYPOINT ["node", "js/server/index"]
WORKDIR /app

ADD . /app
RUN npm install && npm run build
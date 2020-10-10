FROM node:12.18
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y python3 git graphicsmagick build-essential && yarn
EXPOSE 8000
ENV DEBUG=kemono* \
    DB_ROOT=/storage \
    ORIGIN=http://localhost:8000 \
    PUBLIC_ORIGIN=http://localhost:8000
VOLUME [ "/storage", "/config" ]
CMD ["yarn", "start"]
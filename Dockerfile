FROM node:8.17
WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y python3 git build-essential && yarn
EXPOSE 8000
ENV DB_ROOT=/storage \
    ORIGIN=http://localhost:8000
VOLUME [ "/storage", "/config" ]
CMD ["yarn", "start"]
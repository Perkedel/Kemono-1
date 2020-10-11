[![Telegram](https://img.shields.io/badge/-telegram-blue)](https://t.me/kemonoparty)

[Kemono](https://kemono.party) is an open-source reimplementation of [yiff.party](https://yiff.party/). It archives and dumps data, images, and files from paysites like Patreon.

Kemono's codebase consists of both importers to handle API data and a frontend to share it. While the status of the project is considered stable, there may be bugs and weird quirks here and there. Beware!

![Screenshot](md/screenshot.jpg)

### Supported Sites
- Patreon
- Pixiv Fanbox
- Gumroad
- Discord
- DLsite
- SubscribeStar

### Dependencies
- Node *v8.x*
- Yarn
- PostgreSQL
- Redis

## Running
### Quick Start
```sh
# make sure you have docker/compose installed
git clone https://github.com/OpenYiff/Kemono && cd Kemono
docker-compose build
docker-compose up -d
```
Kemono should now be running on port [8000](http://localhost:8000). For production, you should probably configure `.env`.
### Standalone
- Ensure you have external dependencies installed, and databases running.
- Install packages (`yarn`)
- Copy `.env.example` to `.env` and configure
- Start the development server. (`yarn run dev`) 

## Migrating from v1.x >> v2.0
Kemono 2.0.0 uses Postgres for speed and scalability, and comes packaged with a migration script for users of older versions.
```sh
# Make sure both databases are exposed to the local network (edit docker-compose.yml)
node migrate-to-2.0.js <mongo url>
# The script will automatically connect to the database service and start migrating.
# If running standalone, you'll need to manually set Postgres environment variables.
env PGHOST=127.0.0.1 PGUSER=someuser PGPASSWORD= PGDATABASE=someuser node migrate-to-2.0.js <mongo url>
```

---

[Licensed under BSD 3-Clause.](/LICENSE) [tldr.](https://www.tldrlegal.com/l/bsd3)

Kemono itself does not circumvent any technological copyright measures. Content is retrieved legally.

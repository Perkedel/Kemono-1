-- TODO: Implement tagging/ratings/revisions
-- Goal for now is just to get Kemono working in SQL.

-- Posts
CREATE TABLE IF NOT EXISTS booru_posts (
  "id" varchar(255) NOT NULL,
  "user" varchar(255) NOT NULL,
  "service" varchar(20) NOT NULL,
  "title" text NOT NULL DEFAULT '',
  "content" text NOT NULL DEFAULT '',
  "embed" jsonb NOT NULL DEFAULT '{}',
  "shared_file" boolean NOT NULL DEFAULT '0',
  "added" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published" timestamp,
  "edited" timestamp,
  "file" jsonb NOT NULL,
  "attachments" jsonb[] NOT NULL
);
CREATE INDEX IF NOT EXISTS id_idx ON booru_posts USING hash ("id");
CREATE INDEX IF NOT EXISTS user_idx ON booru_posts USING hash ("user");
CREATE INDEX IF NOT EXISTS service_idx ON booru_posts USING hash ("service");
CREATE INDEX IF NOT EXISTS added_idx ON booru_posts USING btree ("added");
CREATE INDEX IF NOT EXISTS published_idx ON booru_posts USING btree ("published");

-- Booru bans
CREATE TABLE IF NOT EXISTS dnp (
  "id" varchar(255) NOT NULL,
  "service" varchar(20) NOT NULL,
);

-- Posts (Discord)
CREATE TABLE IF NOT EXISTS discord_posts (
  "id" varchar(255) NOT NULL,
  "author" jsonb NOT NULL,
  "server" varchar(255) NOT NULL,
  "channel" varchar(255) NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "added" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published" timestamp,
  "edited" timestamp,
  "embeds" jsonb[] NOT NULL,
  "mentions" jsonb[] NOT NULL,
  "attachments" jsonb[] NOT NULL
);
CREATE INDEX IF NOT EXISTS discord_id_idx ON discord_posts USING hash ("id");
CREATE INDEX IF NOT EXISTS server_idx ON discord_posts USING hash ("server");
CREATE INDEX IF NOT EXISTS channel_idx ON discord_posts USING hash ("channel");

-- Flags
CREATE TABLE IF NOT EXISTS booru_flags (
  "id" varchar(255) NOT NULL,
  "user" varchar(255) NOT NULL,
  "service" varchar(20) NOT NULL,
);

-- Lookup
CREATE TABLE IF NOT EXISTS lookup (
  "id" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "service" varchar(20) NOT NULL,
  "indexed" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS name_idx ON lookup USING btree ("name");

-- Board
CREATE TABLE IF NOT EXISTS board_replies (
  "reply" varchar(255) NOT NULL,
  "in" varchar(255) NOT NULL
);
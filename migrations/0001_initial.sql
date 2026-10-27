CREATE TABLE posts (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('experience','comment')),
 year TEXT NOT NULL DEFAULT '', round TEXT NOT NULL DEFAULT '', topic TEXT NOT NULL DEFAULT '',
 reasons TEXT NOT NULL DEFAULT '[]', body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published')),
 day TEXT NOT NULL, delete_hash TEXT NOT NULL
);
CREATE INDEX posts_status_day ON posts(status,day);

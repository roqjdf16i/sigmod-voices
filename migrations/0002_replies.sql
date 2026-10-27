ALTER TABLE posts ADD COLUMN nickname TEXT NOT NULL DEFAULT 'Anonymous';
ALTER TABLE posts ADD COLUMN author_key TEXT NOT NULL DEFAULT '';
CREATE TABLE replies (
 id TEXT PRIMARY KEY,
 post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 reply_to TEXT REFERENCES replies(id) ON DELETE SET NULL,
 reply_to_name TEXT NOT NULL DEFAULT '',
 nickname TEXT NOT NULL,
 author_key TEXT NOT NULL,
 body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published')),
 day TEXT NOT NULL,
 delete_hash TEXT NOT NULL
);
CREATE INDEX replies_post_status ON replies(post_id,status);
CREATE INDEX replies_target ON replies(reply_to);

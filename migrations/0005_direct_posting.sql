ALTER TABLE posts ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE replies ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
-- Legacy timestamps had only date precision; preserve their original insertion order as a tie-breaker.
UPDATE posts SET created_at=day||'T00:00:00.000Z';
UPDATE replies SET created_at=day||'T00:00:00.000Z';
UPDATE posts SET status='published' WHERE status='pending';
UPDATE replies SET status='published' WHERE status='pending';
CREATE INDEX posts_created ON posts(status,created_at);

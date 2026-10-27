CREATE TABLE identities (
 author_key TEXT PRIMARY KEY,
 nickname TEXT NOT NULL,
 locked INTEGER NOT NULL DEFAULT 0 CHECK(locked IN (0,1))
);
INSERT OR IGNORE INTO identities(author_key,nickname,locked)
 SELECT author_key,nickname,1 FROM posts WHERE author_key!='';
INSERT OR IGNORE INTO identities(author_key,nickname,locked)
 SELECT author_key,nickname,1 FROM replies WHERE author_key!='';
CREATE TRIGGER posts_lock_nickname AFTER INSERT ON posts
 BEGIN UPDATE identities SET locked=1 WHERE author_key=NEW.author_key; END;
CREATE TRIGGER replies_lock_nickname AFTER INSERT ON replies
 BEGIN UPDATE identities SET locked=1 WHERE author_key=NEW.author_key; END;

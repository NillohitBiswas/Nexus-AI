BEGIN;
INSERT INTO "Channel" (id, "userId", name, "subCount", thumbnail, "isCompetitor", "youtubeAccessToken", "youtubeRefreshToken")
VALUES ('test_null_user_162616', NULL, 'test-null-user', 0, '', false, NULL, NULL);
DELETE FROM "Channel" WHERE id = 'test_null_user_162616';
COMMIT;

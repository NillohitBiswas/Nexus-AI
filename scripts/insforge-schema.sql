-- Run once in InsForge Postgres SQL console (Dashboard → Database → SQL)
-- Then locally: npm run db:push

CREATE EXTENSION IF NOT EXISTS vector;

-- Optional: semantic cache similarity (used by lib/ai/semantic-cache.ts)
CREATE OR REPLACE FUNCTION match_comments(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  category text,
  sentiment float,
  intensity int,
  intent text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ci.id::text,
    ci.category,
    ci.sentiment,
    ci.intensity,
    ci.intent,
    1 - (ci.embedding <=> query_embedding) AS similarity
  FROM "CommentIntelligence" ci
  WHERE ci.embedding IS NOT NULL
    AND 1 - (ci.embedding <=> query_embedding) > match_threshold
  ORDER BY ci.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE INDEX IF NOT EXISTS comment_intelligence_embedding_idx
  ON "CommentIntelligence"
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

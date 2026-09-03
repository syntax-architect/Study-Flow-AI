const fs = require('fs');
let code = fs.readFileSync('server/database/supabase_setup.sql', 'utf8');

const sqlAppend = `

-- ==========================================
-- Long-Term Memory (LTM) Setup
-- ==========================================

-- 1. Create the user_memories table
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Setup RLS
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own memories" ON public.user_memories;
DROP POLICY IF EXISTS "Service role can write memories" ON public.user_memories;

CREATE POLICY "Users can read own memories" ON public.user_memories 
FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Service role can write memories" ON public.user_memories 
FOR INSERT TO service_role WITH CHECK (true);

GRANT ALL ON public.user_memories TO anon, authenticated;

-- 3. Create HNSW index
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding_hnsw ON public.user_memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON public.user_memories(user_id);

-- 4. Create the match_user_memories function
CREATE OR REPLACE FUNCTION match_user_memories (
  p_user_id text,
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM user_memories
  WHERE user_id = p_user_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
`;

if (!code.includes('user_memories')) {
    fs.writeFileSync('server/database/supabase_setup.sql', code + sqlAppend);
    console.log('Appended user_memories setup');
} else {
    console.log('user_memories already exists');
}

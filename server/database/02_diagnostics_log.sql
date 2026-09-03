-- Migration to add diagnostics_log table for health checks

CREATE TABLE IF NOT EXISTS public.diagnostics_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL,
    message TEXT
);

-- Enable RLS
ALTER TABLE public.diagnostics_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything
CREATE POLICY "Service role can manage diagnostics log" 
ON public.diagnostics_log 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

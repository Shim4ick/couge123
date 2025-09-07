-- Remove position from servers table
ALTER TABLE public.servers DROP COLUMN IF EXISTS position;

-- Create table for personal server positions
CREATE TABLE public.server_positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    server_id integer REFERENCES public.servers(id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, server_id)
);

-- Enable RLS
ALTER TABLE public.server_positions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own server positions"
    ON public.server_positions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own server positions"
    ON public.server_positions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own server positions"
    ON public.server_positions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own server positions"
    ON public.server_positions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_server_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_server_positions_updated_at
    BEFORE UPDATE ON public.server_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_server_positions_updated_at();

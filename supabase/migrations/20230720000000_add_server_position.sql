-- Add position field to servers table
ALTER TABLE public.servers ADD COLUMN position integer DEFAULT 0;

-- Update existing servers to have sequential positions
CREATE OR REPLACE FUNCTION set_initial_server_positions()
RETURNS void AS $$
DECLARE
    server_rec RECORD;
    pos integer := 0;
BEGIN
    FOR server_rec IN SELECT id FROM public.servers ORDER BY created_at ASC LOOP
        UPDATE public.servers SET position = pos WHERE id = server_rec.id;
        pos := pos + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT set_initial_server_positions();

DROP FUNCTION set_initial_server_positions();

-- Add policy for position field
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server owners can update position"
    ON public.servers
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

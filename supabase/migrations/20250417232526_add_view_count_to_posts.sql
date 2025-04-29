ALTER TABLE public.posts
ADD COLUMN view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_post_view (post_id_to_increment int)
RETURNS void
SECURITY DEFINER
LANGUAGE sql
AS $$
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = post_id_to_increment;
$$;
CREATE OR REPLACE FUNCTION get_user_total_views (profile_id_to_sum int)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT sum(view_count)::bigint FROM public.posts WHERE author_id = profile_id_to_sum;
$$;
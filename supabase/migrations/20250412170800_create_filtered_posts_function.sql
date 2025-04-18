create or replace function get_filtered_posts(
    tag_ids integer[] default null,
    username_query text default null,
    page_limit integer default 15,
    page_offset integer default 0
)
returns table (
    id bigint,
    thumbnail_url text,
    video_url text,
    author_id bigint,
    created_at timestamptz,
    profile_username text,
    profile_avatar_url text,
    like_count bigint,
    comment_count bigint
)
language plpgsql
as $$
begin
    return query
    select
        p.id,
        p.thumbnail_url,
        p.video_url,
        p.author_id,
        p.created_at,
        pr.username as profile_username,
        pr.avatar_url as profile_avatar_url,
        (select count(*) from likes l where l.post_id = p.id) as like_count,
        (select count(*) from comments c where c.post_id = p.id) as comment_count
    from
        posts p
    join
        profiles pr on p.author_id = pr.id
    where
        (tag_ids is null or exists (
            select 1
            from post_tags pt
            where pt.post_id = p.id and pt.tag_id = any(tag_ids)
        ))
        and
        (username_query is null or pr.username ilike '%' || username_query || '%')
    order by
        p.created_at desc
    limit
        page_limit
    offset
        page_offset;
end;
$$;


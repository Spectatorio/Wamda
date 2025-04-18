import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, LoadingOverlay, Alert, Group, Text, Skeleton, Box, MultiSelect, TextInput, Button, Stack, Loader } from '@mantine/core';
import { IconExclamationCircle, IconSearch, IconX } from '@tabler/icons-react';
import Masonry from 'react-masonry-css';
import { useIntersection } from '@mantine/hooks';
import { supabase } from '../lib/supabaseClient';
import PostCard from '../components/posts/PostCard';
import './FeedPage.css';

interface PostFeedItem {
    id: number;
    thumbnail_url: string | null;
    video_url: string;
    profiles: {
        username: string;
        avatar_url: string | null;
    } | null;
    likes: { count: number }[];
    comments: { count: number }[];
}

interface Tag {
    id: number;
    name: string;
}

const POSTS_PER_PAGE = 15;
const DEBOUNCE_TIME = 300;

function FeedPage() {
    const [posts, setPosts] = useState<PostFeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [usernameQuery, setUsernameQuery] = useState('');
    const [debouncedUsernameQueryInternal, setDebouncedUsernameQueryInternal] = useState('');
    const [isFetchingTags, setIsFetchingTags] = useState(false);
    const [tagsError, setTagsError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { ref: loadMoreRef, entry } = useIntersection({
        root: containerRef.current,
        threshold: 1.0,
    });

    useEffect(() => {
        const fetchTags = async () => {
            setIsFetchingTags(true);
            setTagsError(null);
            try {
                const { data, error } = await supabase
                    .from('tags')
                    .select('id, name')
                    .order('name', { ascending: true });

                if (error) throw error;
                setAvailableTags(data || []);
            } catch (err: any) {
                console.error("Error fetching tags:", err);
                setTagsError(err.message || 'Failed to load tags.');
            } finally {
                setIsFetchingTags(false);
            }
        };
        fetchTags();
    }, []);


    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedUsernameQueryInternal(usernameQuery);
        }, DEBOUNCE_TIME);

        return () => {
            clearTimeout(handler);
        };
    }, [usernameQuery]);


    const fetchPosts = useCallback(async (pageNum: number, resetPosts = false) => {
        if (pageNum === 0 && posts.length === 0 && !isFiltering) {
             setLoading(true);
        }

        if (resetPosts) setError(null);

        const offset = pageNum * POSTS_PER_PAGE;

        const rpcArgs = {
            tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            username_query: debouncedUsernameQueryInternal || undefined,
            page_limit: POSTS_PER_PAGE,
            page_offset: offset
        };

        console.log("Fetching posts with args:", rpcArgs);

        try {
            const { data, error: rpcError } = await supabase
                .rpc('get_filtered_posts', rpcArgs);

            if (rpcError) {
                throw rpcError;
            }

            if (data) {
                 const formattedData = data.map(p => ({
                    id: p.id,
                    thumbnail_url: p.thumbnail_url,
                    video_url: p.video_url,
                    profiles: p.profile_username ? {
                        username: p.profile_username,
                        avatar_url: p.profile_avatar_url
                    } : null,
                    likes: [{ count: p.like_count ?? 0 }],
                    comments: [{ count: p.comment_count ?? 0 }]
                })) as PostFeedItem[];


                setPosts((prevPosts) => (pageNum === 0 || resetPosts) ? formattedData : [...prevPosts, ...formattedData]);
                setHasMore(data.length === POSTS_PER_PAGE);
            } else {
                setHasMore(false);
                if (pageNum === 0 || resetPosts) setPosts([]);
            }

        } catch (err: any) {
            console.error("Error fetching posts via RPC:", err);
            setError(err.message || 'Failed to fetch posts.');
            setHasMore(false);
            if (resetPosts) setPosts([]);
        } finally {
            setLoading(false);
            setIsFiltering(false);
        }
    }, [selectedTagIds, debouncedUsernameQueryInternal]);


    useEffect(() => {
        setPage(0);
        setHasMore(true);
        setIsFiltering(true);
        fetchPosts(0, true);
    }, [debouncedUsernameQueryInternal, selectedTagIds]);

    useEffect(() => {
        console.log("Initial fetch effect triggered.");
        setIsFiltering(true);
        fetchPosts(0, true);
    }, []);


    useEffect(() => {
        if (entry?.isIntersecting && hasMore && !loading && !isFiltering) {
            console.log("Infinite scroll triggered.");
            const nextPage = page + 1;
            setPage(nextPage);
            setIsFiltering(true);
            fetchPosts(nextPage, false);
        }
    }, [entry?.isIntersecting, hasMore, loading, isFiltering, page, fetchPosts]);

    const breakpointColumnsObj = {
        default: 5,
        1100: 4,
        700: 3,
        500: 2
    };

    const renderSkeletons = () => (
        <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
        >
            {Array.from({ length: POSTS_PER_PAGE }).map((_, index) => (
                <Box key={index} mb="md">
                    <Skeleton height={300 + Math.random() * 150} radius="md" />
                    <Group justify="space-between" mt="xs">
                        <Group gap="xs">
                            <Skeleton height={24} circle />
                            <Skeleton height={16} width="80px" />
                        </Group>
                        <Group gap={4}>
                            <Skeleton height={16} width="40px" />
                            <Skeleton height={16} width="40px" />
                        </Group>
                    </Group>
                </Box>
            ))}
        </Masonry>
    );

    return (
        <Container size="xl" py="md" ref={containerRef}>
            <Stack mb="lg" gap="md">
                <Group grow>
                    <MultiSelect
                        label="Filter by Tags"
                        placeholder={isFetchingTags ? "Loading tags..." : "Select tags"}
                        data={availableTags.map(tag => ({ value: tag.id.toString(), label: tag.name }))}
                        value={selectedTagIds.map(String)}
                        onChange={(values) => setSelectedTagIds(values.map(Number))}
                        searchable
                        clearable
                        disabled={isFetchingTags || loading || isFiltering}
                        error={tagsError}
                    />
                     <TextInput
                        label="Search by Username"
                        placeholder="Enter username..."
                        leftSection={<IconSearch size={14} />}
                        rightSection={isFiltering && !!debouncedUsernameQueryInternal ? <Loader size="xs" /> : null}
                        value={usernameQuery}
                        onChange={(event) => setUsernameQuery(event.currentTarget.value)}
                    />
                </Group>
                {(() => {
                    const filtersAreActive = selectedTagIds.length > 0 || !!usernameQuery;
                    return (
                        <Button
                            variant="light"
                            color="gray"
                            onClick={() => {
                                if (!filtersAreActive) return;
                                setSelectedTagIds([]);
                                setUsernameQuery('');
                            }}
                            leftSection={<IconX size={14} />}
                            disabled={loading || isFiltering || !filtersAreActive}
                            style={{ visibility: filtersAreActive ? 'visible' : 'hidden' }}
                        >
                            Clear Filters
                        </Button>
                    );
                })()}
            </Stack>

            {loading && posts.length === 0 && renderSkeletons()}

            {error && !loading && (
                <Alert icon={<IconExclamationCircle size={16} />} title="Error" color="red" radius="md">
                    {error}
                </Alert>
            )}

            {!error && (
                <Masonry
                    breakpointCols={breakpointColumnsObj}
                    className="my-masonry-grid"
                    columnClassName="my-masonry-grid_column"
                >
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </Masonry>
            )}

            <Box ref={loadMoreRef} mt="xl" style={{ height: 1 }}>
                {(loading || isFiltering) && posts.length > 0 && <LoadingOverlay visible={true} overlayProps={{ blur: 1 }} loaderProps={{ type: 'dots' }} />}
            </Box>

            {!loading && !hasMore && posts.length > 0 && (
                <Text ta="center" c="dimmed" mt="xl">No more posts to load.</Text>
            )}

            {!loading && !error && posts.length === 0 && (
                 <Text ta="center" c="dimmed" mt="xl">
                    {selectedTagIds.length > 0 || usernameQuery
                        ? "No posts match the current filters."
                        : "No posts found. Be the first to create one!"}
                 </Text>
            )}
        </Container>
    );
}

export default FeedPage;

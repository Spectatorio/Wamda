import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from '@tanstack/react-router';
import {
  Container,
  Grid,
  Paper,
  Stack,
  Group,
  Title,
  Text,
  Avatar,
  ActionIcon,
  Button,
  Textarea,
  Chip,
  Loader,
  Alert,
  AspectRatio,
  Box,
  Divider,
  Skeleton,
  LoadingOverlay,
  Tooltip,
} from '@mantine/core';
import { useModals } from '@mantine/modals';
import { IconArrowLeft, IconHeart, IconHeartFilled, IconAlertCircle, IconTrash, IconEye } from '@tabler/icons-react';
import { supabase } from '../lib/supabaseClient';
import { STORAGE_BUCKETS } from '../lib/constants';
import { useAuthStore } from '../store/authStore';
import { Tables } from '../types/supabase';
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { PartialBlock } from "@blocknote/core";
import "@blocknote/core/style.css";
import { notifications } from '@mantine/notifications';

type ProfileData = Pick<Tables<'profiles'>, 'user_id' | 'username' | 'avatar_url' | 'signature'> | null;
type TagData = Pick<Tables<'tags'>, 'id' | 'name'>;
type CommentData = Pick<Tables<'comments'>, 'id' | 'comment_text' | 'created_at'> & {
  profiles: Pick<Tables<'profiles'>, 'username' | 'avatar_url'> | null;
};
type PostData = Tables<'posts'> & {
  profiles: ProfileData;
  tags: TagData[];
  comments: CommentData[];
  likes: [{ count: number }];
};


function ViewPostPage() {
  const params = useParams({ from: '/post/$postId' });
  const postId = params.postId ? parseInt(params.postId, 10) : null;
  const router = useRouter();
  const { session, user, userProfileId } = useAuthStore();
  const modals = useModals();

  const [postData, setPostData] = useState<PostData | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [currentLikeCount, setCurrentLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isCheckingLike, setIsCheckingLike] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [initialContent, setInitialContent] = useState<PartialBlock[] | undefined>(undefined);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  useEffect(() => {
    console.log('[ViewPostPage] useEffect triggered. Parsed postId:', postId);

    if (postId === null || isNaN(postId)) {
      console.error('[ViewPostPage] Invalid or missing postId.');
      setError('Invalid Post ID.');
      setIsLoadingPost(false);
      return;
    }

    let isMounted = true;

    const fetchPostAndLikeStatus = async () => {
      console.log(`[ViewPostPage] Starting fetch for postId: ${postId}`);
      if (!isMounted) return;

      setIsLoadingPost(true);
      setError(null);
      setCommentError(null);
      setPostData(null);
      setComments([]);
      setHasLiked(false);
      setCurrentLikeCount(0);
      setIsCheckingLike(false);

      let fetchedPostData: PostData | null = null;
      try {
        const { data, error: dbError, status } = await supabase
          .from('posts')
          .select(`
            *,
            view_count,
            profiles:author_id ( user_id, username, avatar_url, signature ),
            tags ( id, name ),
            comments ( id, comment_text, created_at, profiles ( username, avatar_url ) ),
            likes ( count )
          `)
          .eq('id', postId)
          .order('created_at', { foreignTable: 'comments', ascending: true })
          .single();

        console.log('[ViewPostPage] Supabase post response:', { data, dbError, status });

        if (!isMounted) return;

        if (dbError && status !== 406) {
          console.error('[ViewPostPage] Supabase post error:', dbError);
          throw dbError;
        }

        if (data) {
          const adjustedData = {
            ...data,
            likes: (data.likes && data.likes.length > 0 ? data.likes : [{ count: 0 }]) as [{ count: number }],
            view_count: data.view_count ?? 0,
            profiles: data.profiles ?? null,
            tags: data.tags ?? [],
            comments: data.comments ?? [],
          };

          fetchedPostData = adjustedData as PostData;

          console.log('[ViewPostPage] Setting post data:', fetchedPostData);

          setComments(fetchedPostData.comments ?? []);
          setPostData(fetchedPostData);
          setCurrentLikeCount(fetchedPostData.likes[0]?.count ?? 0);

          if (postId) {
            try {
              console.log(`[ViewPostPage] Incrementing view count for post: ${postId}`);
              supabase.rpc('increment_post_view', { post_id_to_increment: postId })
                .then(({ error: rpcError }) => {
                  if (rpcError) {
                    console.error('[ViewPostPage] Error calling increment_post_view RPC:', rpcError);
                  } else {
                    console.log(`[ViewPostPage] View count increment initiated for post: ${postId}`);
                  }
                });
            } catch (rpcError) {
              console.error('[ViewPostPage] Synchronous error setting up increment RPC call:', rpcError);
            }
          }

          if (fetchedPostData?.content_markdown) {
            setIsLoadingContent(true);
            try {
              const parsedBlocks = JSON.parse(fetchedPostData.content_markdown as string);

              if (Array.isArray(parsedBlocks)) {
                if (isMounted) {
                  setInitialContent(parsedBlocks as PartialBlock[]);
                  console.log('[ViewPostPage] Parsed content_markdown JSON to blocks.');
                }
              } else {
                console.error('[ViewPostPage] Parsed content_markdown is not an array:', parsedBlocks);
                if (isMounted) {
                  setInitialContent([]);
                }
              }
            } catch (error) {
              console.error("[ViewPostPage] Error parsing content_markdown JSON:", error);
              if (isMounted) {
                setInitialContent([]);
              }
            } finally {
              if (isMounted) {
                setIsLoadingContent(false);
              }
            }
          } else if (fetchedPostData) {
            if (isMounted) {
              setInitialContent([]);
              setIsLoadingContent(false);
              console.log('[ViewPostPage] Post content_markdown is null or empty, setting empty blocks.');
            }
          } else {
            if (isMounted) {
                setIsLoadingContent(false);
            }
          }






          setError(null);
        } else {
          console.log('[ViewPostPage] Post not found (data is null).');
          setError('Post not found.');
          setComments([]);
          setPostData(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[ViewPostPage] Caught error during post fetch:', err);
          setError(err.message || 'Failed to fetch post data.');
          setComments([]);
          setPostData(null);
        }
      } finally {
        if (isMounted) {
            console.log('[ViewPostPage] Post fetch finished, setting loading to false.');
            setIsLoadingPost(false);
        }
      }

      if (fetchedPostData && userProfileId && isMounted) {
        setIsCheckingLike(true);
        try {
          console.log(`[ViewPostPage] Checking like status for post ${postId} and user profile ID ${userProfileId}`);
          const { count, error: likeError } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId)
            .eq('user_id', userProfileId);

          if (!isMounted) return;

          if (likeError) {
            console.error('[ViewPostPage] Error checking like status:', likeError);
          } else {
            console.log('[ViewPostPage] Like check count:', count);
            setHasLiked(count !== null && count > 0);
          }
        } catch (err: any) {
          if (isMounted) {
            console.error('[ViewPostPage] Error checking like status:', err);
          }
        } finally {
          if (isMounted) {
            setIsCheckingLike(false);
            console.log('[ViewPostPage] Finished checking like status.');
          }
        }
      } else if (isMounted) {
          setIsCheckingLike(false);
          console.log('[ViewPostPage] Skipping like status check (not logged in or post failed/no profile ID).');
      }
    };

    fetchPostAndLikeStatus();

    return () => {
      console.log('[ViewPostPage] Component unmounting or dependencies changed.');
      isMounted = false;
    };
  }, [postId, userProfileId]);

  useEffect(() => {
    if (!postId || isNaN(postId)) {
      console.log('[Realtime] Invalid postId, skipping subscription.');
      return;
    }

    console.log(`[Realtime] Setting up subscriptions for post:${postId}`);
    const channel = supabase
      .channel(`post-realtime:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          console.log('[Realtime:Likes] Like change received!', payload);
          if (payload.eventType === 'INSERT') {
            setCurrentLikeCount((prevCount) => prevCount + 1);
            console.log('[Realtime:Likes] Like count incremented.');
          } else if (payload.eventType === 'DELETE') {
            setCurrentLikeCount((prevCount) => Math.max(0, prevCount - 1));
            console.log('[Realtime:Likes] Like count decremented.');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {
          console.log('[Realtime:Comments] New comment received!', payload);
          const newCommentData = payload.new as Tables<'comments'>;

          if (!newCommentData.user_id) {
            console.error('[Realtime:Comments] New comment payload missing user_id:', newCommentData);
            return;
          }

          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', newCommentData.user_id)
              .single();

            if (profileError) {
              console.error('[Realtime:Comments] Error fetching profile for new comment:', profileError);
              const commentToAdd: CommentData = {
                id: newCommentData.id,
                comment_text: newCommentData.comment_text,
                created_at: newCommentData.created_at,
                profiles: null,
              };
              setComments((prevComments) => [commentToAdd, ...prevComments]);
              return;
            }

            const fullCommentObject: CommentData = {
              id: newCommentData.id,
              comment_text: newCommentData.comment_text,
              created_at: newCommentData.created_at,
              profiles: profileData ? { username: profileData.username, avatar_url: profileData.avatar_url } : null,
            };

            console.log('[Realtime:Comments] Constructed new comment object:', fullCommentObject);
            setComments((prevComments) => {
              const commentExists = prevComments.some(comment => comment.id === fullCommentObject.id);
              if (commentExists) {
                console.log(`[Realtime:Comments] Comment with ID ${fullCommentObject.id} already exists, skipping addition.`);
                return prevComments;
              }
              console.log(`[Realtime:Comments] Adding new comment with ID ${fullCommentObject.id} to state.`);
              return [fullCommentObject, ...prevComments];
            });
          } catch (fetchError) {
            console.error('[Realtime:Comments] Exception fetching profile for new comment:', fetchError);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`
        },
        (payload) => {
          console.log('[Realtime:Post] Post update received!', payload);
          const newViewCount = payload.new?.view_count;
          const oldViewCount = payload.old?.view_count;

          if (typeof newViewCount === 'number' && newViewCount !== oldViewCount) {
             setPostData(prevData => {
               if (!prevData) {
                 console.warn('[Realtime:Post] Received post update but previous postData state was null.');
                 return null;
               }
               console.log(`[Realtime:Post] View count updated from ${oldViewCount ?? 'undefined'} to: ${newViewCount}`);
               return { ...prevData, view_count: newViewCount };
             });
          } else if (typeof newViewCount !== 'number') {
              console.warn('[Realtime:Post] Received post update but new view_count is not a number:', newViewCount);
          } else {
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed successfully to channel for post ${postId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[Realtime] Channel subscription error/closed for post ${postId}:`, status, err);
          notifications.show({
            title: 'Realtime Connection Issue',
            message: `Could not listen for live updates (${status}). Please refresh if things seem out of sync.`,
            color: 'orange',
            autoClose: 10000,
          });
        }
      });

    return () => {
      console.log(`[Realtime] Removing channel subscription for post:${postId}`);
      const removalPromise = supabase.removeChannel(channel);
      removalPromise.then(status => {
          console.log(`[Realtime] Channel removal status for post ${postId}: ${status}`);
      }).catch(err => {
          console.error(`[Realtime] Error during channel removal for post ${postId}:`, err);
      });
    };
  }, [postId]);

  const editor = useBlockNote(
    {
      initialContent: initialContent,
    },
    [initialContent]
  );

  const handleLike = useCallback(async () => {
    if (!session || !userProfileId || !postId || isLiking) {
      console.log('Like action prerequisites not met:', { session: !!session, userProfileId, postId, isLiking });
      if (!session) {
          console.log("User not logged in, cannot like.");
      }
      return;
    }

    setIsLiking(true);
    const currentlyLiked = hasLiked;

    setHasLiked(!currentlyLiked);
    setError(null);

    try {
      if (currentlyLiked) {
        console.log(`[ViewPostPage] Attempting to unlike post ${postId} by user ${userProfileId}`);
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: userProfileId });

        if (deleteError) {
          console.error('[ViewPostPage] Error unliking post:', deleteError);
          throw deleteError;
        }
        console.log('[ViewPostPage] Unlike successful.');

      } else {
        console.log(`[ViewPostPage] Attempting to like post ${postId} by user ${userProfileId}`);
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: userProfileId });

        if (insertError) {
          console.error('[ViewPostPage] Error liking post:', insertError);
          if (insertError.code === '23505') {
             console.warn('[ViewPostPage] Like already exists, UI might be out of sync.');
          } else {
             throw insertError;
          }
        } else {
            console.log('[ViewPostPage] Like successful.');
        }
      }

    } catch (error) {
      console.error('[ViewPostPage] Failed to update like status:', error);
      setHasLiked(currentlyLiked);
      setError('Failed to update like status. Please try again.');

    } finally {
      setIsLiking(false);
    }
  }, [session, userProfileId, postId, hasLiked, isLiking]);

  const handleCommentSubmit = useCallback(async () => {
    if (!session || !userProfileId || !postId) {
      console.log('Comment prerequisites not met:', { session: !!session, userProfileId, postId });
      setCommentError('You must be logged in to comment.');
      return;
    }

    const trimmedCommentText = newCommentText.trim();
    if (!trimmedCommentText) {
      setCommentError('Comment cannot be empty.');
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const commentData = {
        post_id: postId,
        user_id: userProfileId,
        comment_text: trimmedCommentText,
      };
      console.log('[ViewPostPage] Inserting comment:', commentData);

      const { data: newComment, error: insertError } = await supabase
        .from('comments')
        .insert(commentData)
        .select('*, profiles(username, avatar_url)')
        .single();

      if (insertError) {
        console.error('[ViewPostPage] Error inserting comment:', insertError);
        throw insertError;
      }

      if (!newComment) {
          console.error('[ViewPostPage] Insert successful but no comment data returned.');
          throw new Error('Failed to retrieve new comment data after insertion.');
      }

      console.log('[ViewPostPage] Comment inserted successfully:', newComment);

      const formattedComment: CommentData = {
          id: newComment.id,
          comment_text: newComment.comment_text,
          created_at: newComment.created_at,
          profiles: newComment.profiles ? {
              username: newComment.profiles.username,
              avatar_url: newComment.profiles.avatar_url,
          } : null,
      };
      setComments((prevComments) => [...prevComments, formattedComment]);

      setNewCommentText('');


    } catch (error: any) {
      console.error('[ViewPostPage] Failed to submit comment:', error);
      setCommentError(error.message || 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [newCommentText, session, userProfileId, postId, setComments]);

  const handleDeletePost = useCallback(async () => {
    if (!user || !postData || !postData.profiles || user.id !== postData.profiles.user_id) {
      console.warn('[ViewPostPage] Delete prerequisites not met:', { user: !!user, postData: !!postData, authorMatch: user?.id === postData?.profiles?.user_id });
      notifications.show({
        title: 'Permission Denied',
        message: 'You can only delete your own posts.',
        color: 'red',
      });
      return;
    }

    modals.openConfirmModal({
      title: 'Delete Post',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this post? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete Post', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setIsDeletingPost(true);
        console.log(`[ViewPostPage] Attempting to delete post ${postId} and associated files.`);

        try {
          const videoFolderPath = `${postId}`;
          const thumbnailFolderPath = `${postId}`;
          const contentFolderPath = `${postId}`;

          const cleanupBucket = async (bucketName: string, folderPath: string) => {
            try {
              console.log(`[ViewPostPage] Listing files in bucket '${bucketName}' path '${folderPath}'...`);
              const { data: files, error: listError } = await supabase.storage
                .from(bucketName)
                .list(folderPath);

              if (listError) {
                console.error(`[ViewPostPage] Error listing files in ${bucketName} at ${folderPath}:`, listError);
                return;
              }

              if (files && files.length > 0) {
                const filePathsToRemove = files.map(file => `${folderPath}/${file.name}`);
                console.log(`[ViewPostPage] Removing ${filePathsToRemove.length} files from ${bucketName}:`, filePathsToRemove);
                const { error: removeError } = await supabase.storage
                  .from(bucketName)
                  .remove(filePathsToRemove);

                if (removeError) {
                  console.error(`[ViewPostPage] Error removing files from ${bucketName}:`, removeError);
                } else {
                  console.log(`[ViewPostPage] Successfully removed files from ${bucketName}.`);
                }
              } else {
                console.log(`[ViewPostPage] No files found in ${bucketName} at ${folderPath} to remove.`);
              }
            } catch (err) {
              console.error(`[ViewPostPage] Unexpected error during cleanup for bucket ${bucketName}:`, err);
            }
          };

          const cleanupResults = await Promise.allSettled([
            cleanupBucket(STORAGE_BUCKETS.VIDEOS, videoFolderPath),
            cleanupBucket(STORAGE_BUCKETS.THUMBNAILS, thumbnailFolderPath),
            cleanupBucket(STORAGE_BUCKETS.POST_CONTENT, contentFolderPath)
          ]);

          console.log('[ViewPostPage] Storage cleanup attempts finished:', cleanupResults);

          if (postId === null) {
            console.error('[ViewPostPage] Cannot delete post: postId is null.');
            throw new Error('Post ID is missing, cannot delete.');
          }
          console.log(`[ViewPostPage] Proceeding with database deletion for post ${postId}`);
          const { error: deleteDbError } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

          if (deleteDbError) {
            console.error('[ViewPostPage] Error deleting post from database:', deleteDbError);
            throw deleteDbError;
          }

          console.log(`[ViewPostPage] Post ${postId} deleted successfully from database.`);
          notifications.show({
            title: 'Post Deleted',
            message: 'The post and associated files have been successfully deleted.',
            color: 'green',
          });
          router.navigate({ to: '/' });

        } catch (error: any) {
          console.error('[ViewPostPage] Failed to delete post:', error);
          notifications.show({
            title: 'Deletion Failed',
            message: error.message || 'An error occurred while deleting the post. Please try again.',
            color: 'red',
          });
        } finally {
          setIsDeletingPost(false);
        }
      },
      onCancel: () => console.log('[ViewPostPage] Post deletion cancelled.'),
    });
  }, [user, postData, postId, modals, router, notifications]);


  if (isLoadingPost) {
    return (
      <Container size="lg" my="md">
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Skeleton height={400} mb="md" />
            <Skeleton height={20} width="30%" mb="sm" />
            <Skeleton height={150} />
            <Skeleton height={20} width="20%" mt="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Skeleton height={50} mb="md" />
            <Skeleton height={300} />
            <Skeleton height={50} mt="md" />
          </Grid.Col>
        </Grid>
      </Container>
    );
  }

  if (error && !postData) {
    return (
      <Container size="sm" my="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" variant="light">
          {error}
        </Alert>
        <Button onClick={() => router.history.back()} mt="md">
          Go Back
        </Button>
      </Container>
    );
  }

  if (!postData) {
    return (
        <Container size="sm" my="xl">
            <Alert icon={<IconAlertCircle size="1rem" />} title="Not Found" color="yellow" variant="light">
            {error || 'The requested post could not be found.'}
            </Alert>
            <Button onClick={() => router.history.back()} mt="md">
            Go Back
            </Button>
      </Container>
    );
  }

  const { video_url, content_markdown, profiles: author, tags } = postData;

  return (
    <Container size="lg" my="md">
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <Box>
                <ActionIcon variant="subtle" onClick={() => router.history.back()} size="lg">
                <IconArrowLeft />
                </ActionIcon>
            </Box>

            {video_url && (
              <Paper shadow="xs" radius="md" withBorder>
                 <AspectRatio ratio={16 / 9}>
                    <video
                        src={video_url}
                        controls
                        style={{ display: 'block', width: '100%', borderRadius: 'var(--mantine-radius-md)' }}
                    />
                 </AspectRatio>
              </Paper>
            )}

            <Paper p="md" shadow="xs" radius="md" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              <Title order={3} mb="sm">Post Content</Title>
              {isLoadingContent ? (
                <Group justify="center" my="md">
                  <Loader />
                  <Text>Loading content...</Text>
                </Group>
              ) : editor ? (
                <BlockNoteView editor={editor} theme={"light"} editable={false} />
              ) : (
                <Text c="dimmed">No content available or error loading content.</Text>
              )}

              {author?.signature && (
                <Text size="sm" c="dimmed" mt="lg" style={{ alignSelf: 'flex-start' }}>
                  {author.signature}
                </Text>
              )}
            </Paper>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" shadow="xs" radius="md" withBorder>
            <Stack gap="md">
              {author && (
                <Group>
                  <Avatar src={author.avatar_url} alt={author.username ?? 'Author'} radius="xl" />
                  <Text fw={500}>{author.username ?? 'Unknown Author'}</Text>
                </Group>
              )}
              <Divider />

              {user && postData.profiles && user.id === postData.profiles.user_id && (
                <Button
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  variant="outline"
                  onClick={handleDeletePost}
                  loading={isDeletingPost}
                  disabled={isDeletingPost}
                  fullWidth
                >
                  Delete Post
                </Button>
              )}

              <Group justify="space-between">
                <Text fw={500}>Stats</Text>
                <Group gap="md" align="center">
                  <Group gap={4} align="center">
                    {isCheckingLike ? (
                      <Loader size="xs" />
                    ) : hasLiked ? (
                      <IconHeartFilled size={18} color="var(--mantine-color-red-6)" />
                    ) : (
                      <IconHeart size={18} />
                    )}
                    <Text size="sm">{currentLikeCount}</Text>
                  </Group>
                  <Group gap={4} align="center">
                    <IconEye size={18} color="gray" />
                    <Text size="sm" c="dimmed">{postData?.view_count ?? 0}</Text>
                  </Group>
                </Group>
              </Group>
              <Tooltip label="Login required to like posts" disabled={!!session}>
                <Box pos="relative">
                  <LoadingOverlay visible={isLiking} zIndex={1} overlayProps={{ radius: "sm", blur: 1 }} loaderProps={{ size: 'sm' }} />
                  <Button
                    leftSection={hasLiked ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
                    variant={hasLiked ? "filled" : "light"}
                    color={hasLiked ? "red" : "gray"}
                    disabled={!session || isLiking || isCheckingLike}
                    onClick={handleLike}
                    fullWidth
                  >
                    {hasLiked ? 'Unlike' : 'Like'}
                  </Button>
                </Box>
              </Tooltip>
              {error && postData && (
                 <Text c="red" size="sm" mt={-10} mb={5}>
                    {error}
                 </Text>
              )}


              <Divider />

              {tags.length > 0 && (
                <>
                  <Text fw={500}>Tags</Text>
                  <Group gap="xs">
                    {tags.map((tag) => (
                      <Chip key={tag.id} variant="light" size="sm" readOnly>
                        {tag.name}
                      </Chip>
                    ))}
                  </Group>
                  <Divider />
                </>
              )}


              <Text fw={500}>Comments ({comments.length})</Text>
              <Stack gap="md" style={{ maxHeight: '400px', overflowY: 'auto' }} mb="md">
                {comments.length > 0 ? (
                  <>
                    {comments.map((comment) => (
                      <Group key={comment.id} wrap="nowrap" align="flex-start">
                        <Avatar
                          src={comment.profiles?.avatar_url}
                          alt={comment.profiles?.username ?? 'User'}
                          radius="xl"
                          size="sm"
                        />
                        <Stack gap={0}>
                          <Group gap="xs">
                            <Text size="sm" fw={500}>{comment.profiles?.username ?? 'Anonymous'}</Text>
                            <Text size="xs" c="dimmed">{new Date(comment.created_at).toLocaleString()}</Text>
                          </Group>
                          <Text size="sm">{comment.comment_text}</Text>
                        </Stack>
                      </Group>
                    ))}
                  </>
                ) : (
                  <Text size="sm" c="dimmed">Be the first to comment!</Text>
                )}
              </Stack>

              <Divider mb="sm" />
              <Textarea
                placeholder={session ? "Add your comment..." : "Login to add a comment"}
                value={newCommentText}
                onChange={(event) => setNewCommentText(event.currentTarget.value)}
                disabled={!session || isSubmittingComment}
                minRows={2}
                autosize
                error={commentError}
              />
              <Button
                mt="xs"
                onClick={handleCommentSubmit}
                disabled={!session || !newCommentText.trim() || isSubmittingComment}
                loading={isSubmittingComment}
                fullWidth
              >
                Post Comment
              </Button>

            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default ViewPostPage;


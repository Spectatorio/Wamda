import React, { useRef, useEffect } from 'react';
import { Card, Text, Group, Avatar, ActionIcon} from '@mantine/core';
import { IconHeart, IconMessageCircle } from '@tabler/icons-react';
import { Link, useNavigate } from '@tanstack/react-router';
import classes from './PostCard.module.css';

interface PostData {
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

interface PostCardProps {
    post: PostData;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const likeCount = post.likes[0]?.count ?? 0;
    const commentCount = post.comments[0]?.count ?? 0;
    const author = post.profiles;

    const posterUrl = post.thumbnail_url ?? 'https://placehold.co/600x400/EEE/31343C?text=Video';
    const avatarUrl = author?.avatar_url ?? 'https://via.placeholder.com/40?text=N/A';

    const handleAuthorClick = (event: React.MouseEvent) => {
        if (!author?.username) {
            event.preventDefault();
        }
        event.stopPropagation();
    };

    const handleCardClick = () => {
        navigate({ to: '/post/$postId', params: { postId: String(post.id) } });
    };

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        videoElement.play().catch(error => {
                            console.error("Video autoplay failed:", error);
                        });
                    } else {
                        videoElement.pause();
                    }
                });
            },
            {
                threshold: 0.5,
            }
        );

        observer.observe(videoElement);

        return () => {
            observer.disconnect();
        };
    }, [post.video_url]);


    return (
        <div onClick={handleCardClick} className={classes.card} style={{ cursor: 'pointer' }}>
            <Card shadow="sm" padding={0} radius="md" withBorder className={classes.cardInner}>
                <video
                    ref={videoRef}
                    src={post.video_url}
                    poster={posterUrl}
                    muted
                    loop
                    playsInline
                    className={classes.videoElement}
                    preload="metadata"
                    aria-label={`Video post by ${author?.username ?? 'Unknown'}`}
                />
                <div className={classes.overlay}>

                <Group justify="space-between" mt="xs" mb="xs" wrap="nowrap">
                    <Link
                        to="/profile/$username"
                        params={{ username: author?.username ?? '' }}
                        className={classes.authorLink}
                        onClick={handleAuthorClick}
                        aria-disabled={!author?.username}
                        tabIndex={!author?.username ? -1 : undefined}
                    >
                        <Group gap="xs" wrap="nowrap">
                            <Avatar src={avatarUrl} alt={`${author?.username ?? 'Unknown'}'s avatar`} radius="xl" size="sm" />
                            <Text size="sm" truncate>{author?.username ?? 'Unknown User'}</Text>
                        </Group>
                    </Link>
                    <Group gap={4} wrap="nowrap">
                        <ActionIcon variant="subtle" color="gray" size="sm" disabled>
                            <IconHeart size={16} />
                        </ActionIcon>
                        <Text size="xs" c="dimmed">{likeCount}</Text>
                        <ActionIcon variant="subtle" color="gray" size="sm" disabled>
                            <IconMessageCircle size={16} />
                        </ActionIcon>
                        <Text size="xs" c="dimmed">{commentCount}</Text>
                    </Group>
                </Group>
                </div>
            </Card>
        </div>
    );
};

export default PostCard;
import React from 'react';
import { Avatar, Text, Group, Stack, Anchor, Box, Indicator, useComputedColorScheme } from '@mantine/core';
import { formatDistanceToNowStrict } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { Database } from '@/types/supabase';

export type NotificationWithActor = Database['public']['Tables']['notifications']['Row'] & {
  actor: Pick<Database['public']['Tables']['profiles']['Row'], 'username' | 'avatar_url'> | null;
};

interface NotificationsPanelProps {
  notifications: NotificationWithActor[];
  onClose: () => void;
}

const getNotificationText = (notification: NotificationWithActor): React.ReactNode => {
    const actorUsername = notification.actor?.username ?? 'Someone';
    switch (notification.type) {
        case 'comment':
            return <Text span>{actorUsername} commented on your post.</Text>;
        case 'like':
            return <Text span>{actorUsername} liked your post.</Text>;
        case 'new_follower':
            return <Text span>{actorUsername} started following you.</Text>;
        default:
            return <Text span>New notification from {actorUsername}.</Text>;
    }
};

const getNotificationLink = (notification: NotificationWithActor): string | null => {
    switch (notification.type) {
        case 'comment':
        case 'like':
            return notification.post_id ? `/post/${notification.post_id}` : null;
        case 'new_follower':
            return notification.actor_user_id ? `/profile/${notification.actor_user_id}` : null;
        default:
            return null;
    }
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ notifications, onClose }) => {
  const computedColorScheme = useComputedColorScheme('light');
  if (notifications.length === 0) {
    return <Text p="md" c="dimmed" ta="center">No new notifications.</Text>;
  }

  return (
    <Stack gap="xs" p="sm" style={{ maxHeight: 400, overflowY: 'auto' }}>
      {notifications.map((notification) => {
        const avatarUrl = notification.actor?.avatar_url;
        const link = getNotificationLink(notification);
        const content = (
          <Group key={notification.id} wrap="nowrap" gap="sm" p="xs" style={{ borderRadius: 'var(--mantine-radius-sm)', cursor: link ? 'pointer' : 'default' }}>
             <Indicator color="blue" size={8} disabled={notification.is_read} withBorder processing={!notification.is_read}>
                <Avatar
                    src={avatarUrl}
                    alt={notification.actor?.username ?? 'User avatar'}
                    radius="xl"
                    size="md"
                />
             </Indicator>
            <Box style={{ flex: 1 }}>
              <Text size="sm" lineClamp={2}>
                {getNotificationText(notification)}
              </Text>
              <Text size="xs" c="dimmed">
                {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
              </Text>
            </Box>
          </Group>
        );

        if (link) {
          return (
            <Anchor
              component={Link}
              to={link}
              key={notification.id}
              underline="never"
              onClick={onClose}
              style={(theme) => ({
                 display: 'block',
                 color: 'inherit',
                 borderRadius: theme.radius.sm,
                 '&:hover': {
                   backgroundColor: computedColorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
                 },
              })}
            >
              {content}
            </Anchor>
          );
        }

        return <Box key={notification.id}>{content}</Box>;
      })}
    </Stack>
  );
};

export default NotificationsPanel;
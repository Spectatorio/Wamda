import { Box, Button, Group, Text, Title, Avatar, Menu, UnstyledButton, rem, Popover, Indicator, ActionIcon, Loader } from '@mantine/core';
import { useAuthStore } from '../../store/authStore';
import { Link, useNavigate } from '@tanstack/react-router';
import { IconLogout, IconUser, IconPlus, IconChevronDown, IconBell } from '@tabler/icons-react';
import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationsPanel from '@/components/notifications/NotificationsPanel';


const GuestActions = () => (
  <Group>
    <Button component={Link} to="/login" variant="default">
      Sign In
    </Button>
    <Button component={Link} to="/signup" variant="filled" color="red">
      Join
    </Button>
  </Group>
);

const AuthActions = () => {
  const { username, user, avatarUrl, signOutUser } = useAuthStore();
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading: notificationsLoading, error: notificationsError, markNotificationsAsRead } = useNotifications();

  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const [notificationsOpened, setNotificationsOpened] = useState(false);

  const handleSignOut = async () => {
    await signOutUser();
    navigate({ to: '/' });
  };

  const toggleNotificationsPopover = () => {
    const currentlyOpened = notificationsOpened;
    setNotificationsOpened(!currentlyOpened);

    if (!currentlyOpened && unreadCount > 0) {
      markNotificationsAsRead();
    }
  };

  const handlePopoverClose = () => {
    setNotificationsOpened(false);
  };

  return (
  <Group>
    <Button
      component={Link}
      to="/create"
      leftSection={<IconPlus size={14} />}
      variant="filled"
      color="red"
    >
      Create Post
    </Button>
    <Popover
      width={350}
      position="bottom-end"
      withArrow
      shadow="md"
      opened={notificationsOpened}
      onClose={handlePopoverClose}
    >
      <Popover.Target>
        <Indicator inline label={unreadCount} size={16} disabled={unreadCount === 0} color="red" withBorder processing={unreadCount > 0}>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Show notifications"
            onClick={toggleNotificationsPopover}
          >
            <IconBell size={18} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        {notificationsLoading ? (
          <Group justify="center" p="md"><Loader size="sm" /></Group>
        ) : notificationsError ? (
          <Text c="red" p="md" size="sm">Error loading notifications.</Text>
        ) : (
          <NotificationsPanel notifications={notifications} onClose={handlePopoverClose} />
        )}
      </Popover.Dropdown>
    </Popover>

    <Menu
      shadow="md"
      width={200}
      opened={userMenuOpened}
      onChange={setUserMenuOpened}
      position="bottom-end"
    >
      <Menu.Target>
        <UnstyledButton
           style={{
              display: 'flex',
              alignItems: 'center',
              padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
              borderRadius: 'var(--mantine-radius-sm)',
              transition: 'background-color 150ms ease',
              '&:hover': {
                  backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))',
              },
           }}
        >
          <Group gap="xs">
            <Avatar src={avatarUrl} alt={username?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase()} color="red" radius="xl" size="sm" />
            <Text size="sm" fw={500} style={{ lineHeight: 1, marginRight: rem(3) }}>
              {username ?? user?.email?.split('@')[0] ?? 'User'}
            </Text>
            <IconChevronDown size={14} stroke={1.5} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Account</Menu.Label>
        <Menu.Item component={Link} to={`/profile/${username ?? 'error-no-username'}`} leftSection={<IconUser size={14} />} disabled={!username}>
          Profile (Placeholder)
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleSignOut}>
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  </Group>
 );
};


function Header() {
  const { session } = useAuthStore();

const Logo = () => (
  <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
    <Title order={3} c="red.6">
      Wamda
    </Title>
  </Link>
);



  return (
    <Group justify="space-between" style={{ width: '100%', height: '100%' }}>
      <Logo />

      <Box style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
      </Box>


      {session ? <AuthActions /> : <GuestActions />}
    </Group>
  );
}

export default Header;
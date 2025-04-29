import { useState} from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  Container,
  Grid,
  Paper,
  Title,
  Text,
  Avatar,
  Button,
  Loader,
  Alert,
  SimpleGrid,
  Group,
  Stack,
  Box,
} from '@mantine/core';
import { IconAlertCircle, IconUserCircle } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import { useProfileData } from '../hooks/useProfileData';
import PostCard from '../components/posts/PostCard';
import { useAuthStore } from '../store/authStore';
import EditProfileModal from '../components/profile/EditProfileModal';
import { type Tables } from '../types/supabase';

type Profile = Tables<'profiles'>;

function ProfilePage() {
  const params = useParams({ from: '/profile/$username' });
  const username = params.username;

  const { profile, posts, stats, loading, error, profileNotFound, refetch } = useProfileData(username);
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
  };

  if (loading) {
    return (
      <Container size="md" mt="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" mt="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
          Failed to load profile data: {getErrorMessage(error)}
        </Alert>
      </Container>
    );
  }

  if (profileNotFound) {
    return (
      <Container size="md" mt="xl">
        <Alert icon={<IconUserCircle size="1rem" />} title="Not Found" color="yellow">
          Profile for username "{username}" not found.
        </Alert>
      </Container>
    );
  }

  const handleOpenModal = () => setIsEditModalOpen(true);
  const handleCloseModal = () => setIsEditModalOpen(false);

  const handleProfileUpdate = async (updatedProfile: Profile) => {
    console.log('ProfilePage received updated profile:', updatedProfile);
    const usernameChanged = profile?.username !== updatedProfile.username;
    const newUsername = updatedProfile.username;

    await refetch();

    if (usernameChanged && newUsername) {
        console.log(`Username changed, navigating to /profile/${newUsername}`);
        navigate({ to: '/profile/$username', params: { username: newUsername }, replace: true });
    }
  };

  if (!profile) {
     return (
      <Container size="md" mt="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
          An unexpected error occurred. Profile data could not be loaded.
        </Alert>
      </Container>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user_id;

  return (
    <Container size="lg" mt="lg">
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper shadow="sm" p="lg" withBorder>
            <Stack align="center" gap="md">
              <Avatar
                src={profile.avatar_url}
                alt={`${profile.username}'s avatar`}
                size={120}
                radius="50%"
                key={profile.avatar_url || 'no-avatar'}
              />
              <Title order={2} ta="center">{profile.username}</Title>
              <Group justify="center" gap="xs">
                {profile.age && <Text size="sm" c="dimmed">Age: {profile.age}</Text>}
                {profile.city && <Text size="sm" c="dimmed">City: {profile.city}</Text>}
              </Group>

              {isOwnProfile && (
                <Button variant="outline" fullWidth mt="sm" onClick={handleOpenModal}>
                  Edit Profile
                </Button>
              )}

              {profile.about_markdown && (
                <Box mt="lg" w="100%">
                  <Title order={4} mb="xs">About Me</Title>
                  <Box style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '100%', overflow: 'auto' }}>
                    <ReactMarkdown key={profile.about_markdown}>{profile.about_markdown}</ReactMarkdown>
                  </Box>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper shadow="sm" p="lg" withBorder mb="lg">
            <Title order={4} mb="md">Stats</Title>
            <Group justify="space-around">
              <Stack align="center" gap={0}>
                 <Text size="xl" fw={700}>{stats?.totalLikes ?? '...'}</Text>
                 <Text size="sm" c="dimmed">Total Likes Received</Text>
              </Stack>
              <Stack align="center" gap={0}>
                 <Text size="xl" fw={700}>{stats?.totalComments ?? '...'}</Text>
                 <Text size="sm" c="dimmed">Total Comments Received</Text>
              </Stack>
              <Stack align="center" gap={0}>
                 <Text size="xl" fw={700}>{stats?.totalViews ?? '...'}</Text>
                 <Text size="sm" c="dimmed">Total Post Views</Text>
              </Stack>
            </Group>
          </Paper>

          <Title order={4} mb="md">Posts</Title>
          {posts.length > 0 ? (
            <SimpleGrid
              cols={{ base: 2, sm: 3 }}
              spacing="md"
            >
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </SimpleGrid>
          ) : (
            <Text c="dimmed">This user hasn't posted anything yet.</Text>
          )}
        </Grid.Col>
      </Grid>


      {profile && isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </Container>
  );
}

export default ProfilePage;
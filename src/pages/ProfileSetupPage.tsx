import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  NumberInput,
  Button,
  Stack,
  SimpleGrid,
  Image,
  Notification,
  Box,
} from '@mantine/core';
import { useForm, zodResolver } from '@mantine/form';
import { z } from 'zod';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import { TablesInsert } from '../types/supabase';

const avatarOptions = [
  'https://robohash.org/robo1?set=set4',
  'https://robohash.org/robo2?set=set4',
  'https://robohash.org/robo3?set=set4',
  'https://robohash.org/robo4?set=set4',
  'https://robohash.org/robo5?set=set4',
  'https://robohash.org/robo6?set=set4',
];

const profileSchema = z.object({
  avatar_url: z.string().url('Invalid avatar URL').min(1, 'Avatar selection is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  age: z.number().int().min(13, 'Must be at least 13 years old').optional().nullable(),
  city: z.string().optional().nullable(),
  signature: z.string().max(50, 'Signature must be at most 50 characters').optional().nullable(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileSetupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshUserProfile = useAuthStore((state) => state.refreshUserProfile);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    validate: zodResolver(profileSchema),
    initialValues: {
      avatar_url: '',
      username: '',
      age: null,
      city: '',
      signature: '',
    },
  });

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
    form.setFieldValue('avatar_url', url);
    form.clearFieldError('avatar_url');
  };

  const handleSubmit = async (values: ProfileFormData) => {
    if (!user) {
      setError('User not authenticated. Please log in again.');
      return;
    }
    setLoading(true);
    setError(null);

    const profileData: TablesInsert<'profiles'> = {
      user_id: user.id,
      username: values.username,
      avatar_url: values.avatar_url,
      age: values.age,
      city: values.city,
      signature: values.signature,
    };

    try {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (insertError) {
        console.error('Supabase profile insert error:', insertError);
        if (insertError.code === '23505') {
          setError('Username already taken. Please choose another one.');
          form.setFieldError('username', 'Username already taken');
        } else {
          setError(`Failed to create profile: ${insertError.message}`);
        }
        setLoading(false);
        return;
      }

      console.log('Profile created successfully!');
      await refreshUserProfile();
      navigate({to : '/'});

    } catch (err) {
      console.error('Unexpected error creating profile:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!user) {
    return <Text>Loading user information or not authenticated...</Text>;
  }

  return (
    <Container size="xs" my={40}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          Complete Your Profile
        </Title>

        {error && (
          <Notification color="red" onClose={() => setError(null)} mb="md">
            {error}
          </Notification>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Text size="sm" fw={500} {...form.getInputProps('avatar_url')}>Select Your Avatar</Text>
            <SimpleGrid cols={3} spacing="md" mb="md">
              {avatarOptions.map((url) => (
                <Box
                  key={url}
                  onClick={() => handleAvatarSelect(url)}
                  style={{
                    cursor: 'pointer',
                    border: selectedAvatar === url ? '2px solid var(--mantine-color-blue-6)' : '2px solid transparent',
                    borderRadius: 'var(--mantine-radius-sm)',
                    padding: '2px',
                  }}
                >
                  <Image src={url} alt={`Avatar option`} radius="sm" fallbackSrc="https://via.placeholder.com/100" />
                </Box>
              ))}
            </SimpleGrid>
            {form.errors.avatar_url && <Text c="red" size="xs">{form.errors.avatar_url}</Text>}


            <TextInput
              required
              label="Username"
              placeholder="Choose a unique username"
              {...form.getInputProps('username')}
            />

            <NumberInput
              label="Age (Optional)"
              placeholder="Your age (must be 13+)"
              min={13}
              {...form.getInputProps('age')}
            />

            <TextInput
              label="City (Optional)"
              placeholder="Your city"
              {...form.getInputProps('city')}
            />

            <TextInput
              label="Signature (Optional)"
              placeholder="A short bio or quote (max 50 chars)"
              description="This will appear on your profile."
              maxLength={50}
              {...form.getInputProps('signature')}
            />

            <Button type="submit" fullWidth mt="xl" loading={loading}>
              Complete Profile
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

export default ProfileSetupPage;
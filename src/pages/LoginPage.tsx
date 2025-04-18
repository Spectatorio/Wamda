import { useState, useEffect } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Title,
  Notification,
  LoadingOverlay,
  Box,
  Text,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { Link, useNavigate } from '@tanstack/react-router';
import { IconX } from '@tabler/icons-react';

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password cannot be empty' }),
});

type LoginFormValues = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate({ from: '/login' });
  const { signInUser, isLoading, error: authError, session } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const success = await signInUser(values.email, values.password);
    if (success) {
      navigate({ to: '/' });
    } else {
      setFormError(useAuthStore.getState().error);
    }
  };

  useEffect(() => {
    if (session) {
      navigate({ to: '/' });
    }
  }, [session, navigate]);

  useEffect(() => {
    setFormError(authError);
  }, [authError]);


  return (
    <Box pos="relative" style={{ maxWidth: 400, margin: 'auto', marginTop: 50 }}>
      <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} />
      <Title order={2} ta="center" mb="lg">
        Sign In to Wamda
      </Title>

      {formError && (
        <Notification
          icon={<IconX size="1.1rem" />}
          color="red"
          title="Sign In Failed"
          mb="md"
          onClose={() => setFormError(null)}
        >
          {formError}
        </Notification>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Email"
            placeholder="your@email.com"
            {...form.getInputProps('email')}
          />

          <PasswordInput
            required
            label="Password"
            placeholder="Your password"
            {...form.getInputProps('password')}
          />

          <Button type="submit" loading={isLoading}>
            Sign In
          </Button>
        </Stack>
      </form>
      <Text ta="center" mt="md">
        Don't have an account?{' '}
        <Anchor component={Link} to="/signup">
          Join Wamda
        </Anchor>
      </Text>
    </Box>
  );
}

export default LoginPage;
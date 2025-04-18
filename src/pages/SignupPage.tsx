import { useState } from 'react';
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
import { IconX, IconCheck } from '@tabler/icons-react';

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

type SignupFormValues = z.infer<typeof schema>;

function SignupPage() {
  const navigate = useNavigate({ from: '/signup' });
  const { signUpUser, isLoading, error: authError } = useAuthStore();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [formError, setFormError] = useState<string | null>(authError);

  const form = useForm<SignupFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: SignupFormValues) => {
    setFormError(null);
    setShowSuccessMessage(false);
    const success = await signUpUser(values.email, values.password);
    if (success) {
      setShowSuccessMessage(true);
      setTimeout(() => {
        navigate({ to: '/profile-setup' });
      }, 2000);
    } else {
      setFormError(useAuthStore.getState().error);
    }
  };

  if (authError && authError !== formError) {
    setFormError(authError);
  }

  return (
    <Box pos="relative" style={{ maxWidth: 400, margin: 'auto', marginTop: 50 }}>
      <LoadingOverlay visible={isLoading} overlayProps={{ radius: "sm", blur: 2 }} />
      <Title order={2} ta="center" mb="lg">
        Join Wamda
      </Title>

      {showSuccessMessage && (
        <Notification
          icon={<IconCheck size="1.1rem" />}
          color="teal"
          title="Sign Up Successful!"
          mb="md"
          withCloseButton={false}
        >
          Please check your email for verification if required. Redirecting to profile setup...
        </Notification>
      )}

      {formError && !showSuccessMessage && (
        <Notification
          icon={<IconX size="1.1rem" />}
          color="red"
          title="Sign Up Failed"
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

          <Button type="submit" loading={isLoading} disabled={showSuccessMessage}>
            Sign Up
          </Button>
        </Stack>
      </form>
      <Text ta="center" mt="md">
        Already have an account?{' '}
        <Anchor component={Link} to="/login">
          Sign In
        </Anchor>
      </Text>
    </Box>
  );
}

export default SignupPage;
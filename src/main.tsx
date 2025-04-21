import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { RouterProvider, createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router';
import { ModalsProvider } from '@mantine/modals';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';
import { useAuthStore } from './store/authStore';
import { Notifications } from '@mantine/notifications';
import { supabase } from './lib/supabaseClient';
import { MainLayout } from './layouts/MainLayout';
import FeedPage from './pages/FeedPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import CreatePostPage from './pages/CreatePostPage';
import ViewPostPage from './pages/ViewPostPage';
import ProfilePage from './pages/ProfilePage';

const theme = createTheme({
  primaryColor: 'red',
});

const rootRoute = createRootRoute({
  component: MainLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: FeedPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: SignupPage,
});

const profileSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile-setup',
  component: ProfileSetupPage,
  beforeLoad: ({ location }) => {
    const { session } = useAuthStore.getState();
    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: CreatePostPage,
  beforeLoad: async ({ location }) => {
    console.log("[Create Route Guard] Executing...");

    const user = await useAuthStore.getState().awaitAuthState();
    console.log("[Create Route Guard] Auth state awaited. User:", user);

    if (!user) {
      console.log("[Create Route Guard] No user after await, redirecting to login.");
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }

    console.log(`[Create Route Guard] Checking profile for user: ${user.id}`);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log(`[Create Route Guard] Profile check result:`, { profile, profileError });

      if (profileError) {
        console.error("[Create Route Guard] Error checking profile:", profileError);
        throw new Error(`Profile check failed: ${profileError.message}`);
      }

      if (!profile) {
        console.log("[Create Route Guard] Profile not found, redirecting to /profile-setup");
        throw redirect({
          to: '/profile-setup',
          search: { redirect: location.href },
        });
      }

      console.log("[Create Route Guard] Profile found, allowing access.");

    } catch (err) {
      if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' && err.message.includes('redirect')) {
        console.log("[Create Route Guard] Caught redirect, re-throwing.");
        throw err;
      }
      console.error("[Create Route Guard] Unexpected error during profile check:", err);
      console.log("[Create Route Guard] Triggering fallback redirect to '/' due to unexpected error.");
      throw redirect({ to: '/' });
    }
  },
});

const viewPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/post/$postId',
  component: ViewPostPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$username',
  component: ProfilePage,
});


const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  profileSetupRoute,
  createPostRoute,
  viewPostRoute,
  profileRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}


const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <MantineProvider theme={theme}>
        <Notifications />
        <ModalsProvider>
          <RouterProvider router={router} />
        </ModalsProvider>
      </MantineProvider>
    </StrictMode>,
  );
}

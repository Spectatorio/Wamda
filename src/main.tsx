import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { RouterProvider, createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router';
import { ModalsProvider } from '@mantine/modals'; // Import ModalsProvider
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css'; // Import notifications styles
import './index.css';
import { useAuthStore } from './store/authStore';
import { Notifications } from '@mantine/notifications';
import { supabase } from './lib/supabaseClient'; // Import supabase client
// Import Layout and Pages
import { MainLayout } from './layouts/MainLayout';
import FeedPage from './pages/FeedPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import CreatePostPage from './pages/CreatePostPage';
import ViewPostPage from './pages/ViewPostPage';
import ProfilePage from './pages/ProfilePage';

// Define the theme
const theme = createTheme({
  primaryColor: 'red', // Using 'red' as the base, index 2 will be the pale red
  // You might want to set the default background color globally if needed
  // colors: {
  //   body: ['#FAF0E6', /* other shades if needed */], // Example for cream background
  // },
  // Mantine uses a 10-shade system (0-9). 'red.2' is the pale red.
  // 'gray.0' is the cream color. We can use these in components.
});

// Define the root route (usually wrapping the main layout)
const rootRoute = createRootRoute({
  component: MainLayout, // MainLayout provides the shell (sidebar, etc.)
});

// Define individual routes as children of the root route
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
    // Check auth state before loading the route
    const { session } = useAuthStore.getState(); // Get state directly in beforeLoad
    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          // Optionally preserve the intended destination
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

    // Wait for auth state to be definitively initialized and get the user
    const user = await useAuthStore.getState().awaitAuthState();
    console.log("[Create Route Guard] Auth state awaited. User:", user);

    // Now check if user is actually logged in
    if (!user) {
      console.log("[Create Route Guard] No user after await, redirecting to login.");
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }

    // Check if profile exists for the logged-in user
    console.log(`[Create Route Guard] Checking profile for user: ${user.id}`);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id') // Select minimal data
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to handle null case without error

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
      // Profile exists, allow route load

    } catch (err) {
      // Catch redirects or other errors
      if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' && err.message.includes('redirect')) {
        console.log("[Create Route Guard] Caught redirect, re-throwing.");
        throw err; // Re-throw redirects
      }
      console.error("[Create Route Guard] Unexpected error during profile check:", err);
      console.log("[Create Route Guard] Triggering fallback redirect to '/' due to unexpected error.");
      throw redirect({ to: '/' });
    }
  },
});

const viewPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/post/$postId', // Using $ for path parameters
  component: ViewPostPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile/$username', // Using $ for path parameters
  component: ProfilePage,
});


// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  profileSetupRoute,
  createPostRoute,
  viewPostRoute,
  profileRoute,
]);

// Create the router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}


// Render the app
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <MantineProvider theme={theme}>
        <Notifications /> {/* Add Notifications provider */}
        <ModalsProvider> {/* Wrap RouterProvider with ModalsProvider */}
          <RouterProvider router={router} />
        </ModalsProvider>
      </MantineProvider>
    </StrictMode>,
  );
}

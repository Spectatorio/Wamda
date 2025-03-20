import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import SignIn from '@/pages/auth/signin';
import SignUp from '@/pages/auth/signup';
import VerifyEmail from '@/pages/auth/verify-email';
import Layout from '@/components/layout/Layout';

// Create the router with all routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <div>Home Page (Coming Soon)</div>,
      },
      {
        path: '/auth',
        children: [
          {
            path: 'signin',
            element: (
              <ProtectedRoute requireAuth={false}>
                <SignIn />
              </ProtectedRoute>
            ),
          },
          {
            path: 'signup',
            element: (
              <ProtectedRoute requireAuth={false}>
                <SignUp />
              </ProtectedRoute>
            ),
          },
          {
            path: 'verify-email',
            element: (
              <ProtectedRoute requireAuth={false}>
                <VerifyEmail />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" />,
  }
]);

// Main router component
export default function AppRouter() {
  return <RouterProvider router={router} />;
}
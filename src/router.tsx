import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import EmailVerificationPending from './pages/EmailVerificationPending';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Public route that redirects to home if user is already authenticated
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  if (user) {
    return <Navigate to="/home" />;
  }
  
  return <>{children}</>;
};

// Create the router with all routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <App><LandingPage /></App>,
  },
  {
    path: '/login',
    element: <App><PublicRoute><LoginForm /></PublicRoute></App>,
  },
  {
    path: '/signup',
    element: <App><PublicRoute><SignupForm /></PublicRoute></App>,
  },
  {
    path: '/verify-email',
    element: <App><PublicRoute><EmailVerificationPending /></PublicRoute></App>,
  },
  {
    path: '/home',
    element: <App><ProtectedRoute><HomePage /></ProtectedRoute></App>,
  },
  {
    path: '*',
    element: <Navigate to="/" />,
  }
]);

// Main router component that provides the AuthContext
export default function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
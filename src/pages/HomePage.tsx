import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { signOut } from '../app/apis/auth';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Welcome to Wamda</h1>
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          disabled={isLoading}
        >
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            {/* Use optional chaining to safely access properties */}
            <span className="text-2xl font-bold text-gray-500">
              {user?.username 
                ? user.username.charAt(0).toUpperCase() 
                : user?.email 
                  ? user.email.charAt(0).toUpperCase()
                  : 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.username || 'User'}</h2>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Your Feed</h3>
          <p className="text-gray-600">
            This is a placeholder for your feed. Soon, you'll see animations from creators you follow here.
          </p>
          
          <div className="mt-6 grid gap-4">
            <Button onClick={() => navigate('/profile')}>
              View Profile
            </Button>
            <Button variant="outline" onClick={() => navigate('/create-post')}>
              Create New Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
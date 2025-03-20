import { Link, Outlet } from 'react-router-dom'
import { Button } from '../ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Wamda</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6">
              {user ? (
                <>
                  <Link 
                    to="/feed" 
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Feed
                  </Link>
                  <Link 
                    to="/profile" 
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Profile
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="text-sm" 
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link 
                    to="/auth/signin" 
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    Sign In
                  </Link>
                  <Button asChild>
                    <Link to="/auth/signup">
                      Sign Up
                    </Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  )
} 
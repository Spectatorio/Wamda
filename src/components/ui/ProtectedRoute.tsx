import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requireAuth && !user) {
    // Redirect to signin but save the attempted location
    return <Navigate to="/auth/signin" state={{ from: location }} replace />
  }

  if (!requireAuth && user) {
    // Redirect to home if user is already authenticated
    return <Navigate to="/" replace />
  }

  return <>{children}</>
} 
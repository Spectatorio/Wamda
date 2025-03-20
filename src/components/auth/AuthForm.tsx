import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { SignatureCanvas } from './SignatureCanvas'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onSuccess?: () => void
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const navigate = useNavigate()
  const { signIn, signUp, error: authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [signature, setSignature] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSignatureError, setShowSignatureError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (mode === 'signup' && !signature) {
      setShowSignatureError(true)
      toast.error('Please draw your signature')
      return
    }

    // Prevent double submission
    if (isSubmitting) return
    setIsSubmitting(true)
    setIsLoading(true)
    setShowSignatureError(false)

    try {
      if (mode === 'signup') {
        await signUp(email, password)
        toast.success('Sign up successful! Please check your email for verification.')
        navigate('/auth/verify-email')
      } else {
        await signIn(email, password)
        toast.success('Sign in successful!')
        onSuccess?.()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      if (errorMessage.includes('32 seconds')) {
        toast.error('Please wait a moment before trying again')
      } else {
        toast.error(errorMessage)
      }
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
      // Add delay before allowing resubmission
      setTimeout(() => setIsSubmitting(false), 1000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mode === 'signup' && (
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {mode === 'signup' && (
        <>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Your Signature
            </label>
            <SignatureCanvas 
              onSignatureChange={(sig) => {
                setSignature(sig)
                setShowSignatureError(false)
              }} 
            />
            {showSignatureError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>
                  Please draw your signature before submitting
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}

      {authError && (
        <Alert variant="destructive">
          <AlertDescription>
            {authError.message}
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isLoading || isSubmitting}
        className="w-full"
        variant="default"
      >
        {isLoading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
      </Button>
    </form>
  )
} 
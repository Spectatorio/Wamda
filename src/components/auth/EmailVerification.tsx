import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { toast } from 'sonner'
import { useEmailVerification } from '@/hooks/useEmailVerification'
import { useNavigate, useLocation } from 'react-router-dom'

export function EmailVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isVerified, isLoading, checkVerification, resendVerification } = useEmailVerification()
  const [progress, setProgress] = useState(0)
  const [isChecking, setIsChecking] = useState(false)

  // Prevent navigation away from verification page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isVerified) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isVerified])

  // Progress bar effect
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return prev + 1 // Even slower progress
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Verification check effect with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    let isSubscribed = true

    const checkStatus = async () => {
      if (isChecking || !isSubscribed) return
      setIsChecking(true)

      try {
        const verified = await checkVerification()
        if (verified && isSubscribed) {
          toast.success('Email verified successfully!')
          // Add a small delay before navigation to ensure the success message is seen
          setTimeout(() => {
            if (isSubscribed) {
              navigate('/')
            }
          }, 1500)
        }
      } finally {
        if (isSubscribed) {
          setIsChecking(false)
        }
      }
    }

    // Initial check
    checkStatus()

    // Set up periodic checks with debounce
    timeoutId = setInterval(checkStatus, 5000) // Check every 5 seconds

    return () => {
      isSubscribed = false
      clearInterval(timeoutId)
    }
  }, [checkVerification, navigate])

  const handleResend = async () => {
    try {
      await resendVerification()
      toast.success('Verification email sent successfully!')
      setProgress(0) // Reset progress on resend
    } catch (error) {
      toast.error('Failed to send verification email. Please try again.')
    }
  }

  // Show loading state only during initial check
  if (isLoading && !isChecking) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Spinner size="large" />
          <p className="mt-4 text-muted-foreground">Checking verification status...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
      </CardHeader>
      <CardContent>
        {!isVerified && (
          <>
            <Alert>
              <AlertDescription>
                Please check your email for a verification link. The link will expire in 24 hours.
                {location.pathname === '/auth/verify-email' && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please complete verification before leaving this page.
                  </p>
                )}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Progress value={progress} className="w-full" />
            </div>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isChecking}
              className="mt-4 w-full"
            >
              {isChecking ? 'Checking...' : 'Resend Verification Email'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
} 
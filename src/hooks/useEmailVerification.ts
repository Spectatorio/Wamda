import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useEmailVerification() {
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const checkVerification = async () => {
    try {
      setIsLoading(true)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) throw error
      
      setIsVerified(user?.email_confirmed_at !== null)
      return user?.email_confirmed_at !== null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check verification status')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerification = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: (await supabase.auth.getUser()).data.user?.email || '',
      })
      
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isVerified,
    isLoading,
    error,
    checkVerification,
    resendVerification,
  }
} 
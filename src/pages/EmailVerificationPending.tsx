import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function EmailVerificationPending() {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    success?: string;
    error?: string;
  }>({});

  // This would be implemented when we have a resend verification endpoint
  const handleResendVerification = async () => {
    setIsResending(true);
    setResendStatus({});
    
    try {
      // This would call an API endpoint to resend the verification email
      // For now, we'll just simulate a successful response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResendStatus({
        success: 'Verification email has been resent. Please check your inbox.'
      });
    } catch (error) {
      setResendStatus({
        error: 'Failed to resend verification email. Please try again.'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Check Your Email</h1>
          <div className="mt-4 text-gray-600">
            <p>We've sent a verification link to your email address.</p>
            <p className="mt-2">
              Please check your inbox and click the verification link to activate your account.
            </p>
          </div>
        </div>

        {resendStatus.success && (
          <Alert>
            <AlertDescription>{resendStatus.success}</AlertDescription>
          </Alert>
        )}

        {resendStatus.error && (
          <Alert variant="destructive">
            <AlertDescription>{resendStatus.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p className="text-center text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
          
          <Button
            onClick={handleResendVerification}
            variant="outline"
            className="w-full"
            disabled={isResending}
          >
            {isResending ? 'Resending...' : 'Resend Verification Email'}
          </Button>
          
          <div className="text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
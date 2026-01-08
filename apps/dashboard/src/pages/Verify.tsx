import { useEffect, useState } from 'react'
import { getAuthClient } from '../lib/api'
import { useAuth } from '../lib/auth'

interface VerifyPageProps {
  token: string
  onSuccess: () => void
}

export function VerifyPage({ token, onSuccess }: VerifyPageProps) {
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    const verify = async () => {
      try {
        const client = getAuthClient()
        const response = await client.verifyMagicLink({ token })

        if (response.sessionToken && response.user) {
          login(response.sessionToken, response.user)
          onSuccess()
        } else {
          setError('Invalid response from server')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify magic link')
      } finally {
        setIsVerifying(false)
      }
    }

    verify()
  }, [token, login, onSuccess])

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your magic link...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Try again
          </a>
        </div>
      </div>
    )
  }

  return null
}

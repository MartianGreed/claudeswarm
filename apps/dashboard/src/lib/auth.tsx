import type { User } from '@claudeswarm/proto'
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { getAuthClient } from './api'
import { getSessionCookie, removeSessionCookie, setSessionCookie } from './cookies'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (sessionToken: string, user: User) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getSessionCookie()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const client = getAuthClient()
        const response = await client.getCurrentUser({})
        if (response.user) {
          setUser(response.user)
        }
      } catch {
        removeSessionCookie()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (sessionToken: string, user: User) => {
    setSessionCookie(sessionToken)
    setUser(user)
  }

  const logout = async () => {
    try {
      const client = getAuthClient()
      await client.logout({})
    } catch {
      // Ignore errors during logout
    } finally {
      removeSessionCookie()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

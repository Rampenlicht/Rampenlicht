import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { profileService } from '../services/profileService'

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const { data, error } = await profileService.getProfile(user.id)
        if (!error && data) {
          setProfile(data)
        }
      }
      setLoading(false)
    }

    if (!authLoading) {
      loadProfile()
    }
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lädt...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    // Redirect basierend auf tatsächlicher Rolle
    if (profile?.role === 'cashier') {
      return <Navigate to="/dashboards/cashier" replace />
    }
    return <Navigate to="/dashboards/user" replace />
  }

  return children
}

export default ProtectedRoute


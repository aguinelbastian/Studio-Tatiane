import { Navigate } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'

const Index = () => {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
}

export default Index

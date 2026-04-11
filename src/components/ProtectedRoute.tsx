import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'
import { UserRole } from '@/types'
import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      })
    }
  }, [user, isLoading, allowedRoles, toast])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

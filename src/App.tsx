import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/stores/useAuthStore'
import { ProtectedRoute } from '@/components/ProtectedRoute'

import Index from './pages/Index'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agendamentos from './pages/Agendamentos'
import Clientes from './pages/Clientes'
import Contratos from './pages/Contratos'
import Pagamentos from './pages/Pagamentos'
import Configuracoes from './pages/Configuracoes'
import Relatorios from './pages/Relatorios'
import Usuarios from './pages/Usuarios'
import NotFound from './pages/NotFound'
import MainLayout from './components/layouts/MainLayout'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes - All Roles */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agendamentos" element={<Agendamentos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/contratos" element={<Contratos />} />

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'superuser']} />}>
                <Route path="/pagamentos" element={<Pagamentos />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['admin', 'superuser']} />}>
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App

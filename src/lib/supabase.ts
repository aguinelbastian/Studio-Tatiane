// Mock Supabase Client
// Since @supabase/supabase-js is not in the included packages list,
// we provide a functional mock that simulates the Supabase Auth API
// to allow the application to work end-to-end as requested.

import { User } from '@/types'

const MOCK_USERS: Record<string, User> = {
  'admin@studio.com': {
    id: '1',
    email: 'admin@studio.com',
    name: 'Tatiane Kafka Ghizoni',
    role: 'Admin',
  },
  'prof@studio.com': {
    id: '2',
    email: 'prof@studio.com',
    name: 'Carlos Instrutor',
    role: 'Profissional',
  },
}

type AuthListener = (event: string, session: { user: User } | null) => void
const listeners: AuthListener[] = []

export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      const user = MOCK_USERS[email]
      if (user && password === 'senha123') {
        const session = { user }
        localStorage.setItem('mock_supabase_session', JSON.stringify(session))
        listeners.forEach((listener) => listener('SIGNED_IN', session))
        return { data: { user, session }, error: null }
      }
      return {
        data: { user: null, session: null },
        error: {
          message:
            'Credenciais inválidas. Use admin@studio.com ou prof@studio.com com a senha "senha123".',
        },
      }
    },
    signOut: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      localStorage.removeItem('mock_supabase_session')
      listeners.forEach((listener) => listener('SIGNED_OUT', null))
      return { error: null }
    },
    getSession: async () => {
      const stored = localStorage.getItem('mock_supabase_session')
      if (stored) {
        return { data: { session: JSON.parse(stored) }, error: null }
      }
      return { data: { session: null }, error: null }
    },
    onAuthStateChange: (callback: AuthListener) => {
      listeners.push(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = listeners.indexOf(callback)
              if (index > -1) listeners.splice(index, 1)
            },
          },
        },
      }
    },
  },
}

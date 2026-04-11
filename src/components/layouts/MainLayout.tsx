import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import useAuthStore from '@/stores/useAuthStore'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileText,
  Settings,
  BarChart3,
  LogOut,
  Leaf,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['Admin', 'Profissional'],
    },
    {
      title: 'Agendamentos',
      icon: CalendarDays,
      path: '/agendamentos',
      roles: ['Admin', 'Profissional'],
    },
    { title: 'Clientes', icon: Users, path: '/clientes', roles: ['Admin', 'Profissional'] },
    { title: 'Contratos', icon: FileText, path: '/contratos', roles: ['Admin', 'Profissional'] },
    { title: 'Relatórios', icon: BarChart3, path: '/relatorios', roles: ['Admin'] },
    { title: 'Configurações', icon: Settings, path: '/configuracoes', roles: ['Admin'] },
  ]

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  )

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background/50">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-4 border-b">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-primary tracking-tight">Studio Pilates</span>
              <span className="text-xs text-muted-foreground">Tatiane K. Ghizoni</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu className="gap-2 p-2">
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          'transition-all duration-200',
                          isActive && 'bg-primary/10 text-primary font-medium',
                        )}
                      >
                        <Link to={item.path} className="flex items-center gap-3">
                          <item.icon
                            className={cn(
                              'size-4',
                              isActive ? 'text-primary' : 'text-muted-foreground',
                            )}
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?gender=${user?.role === 'Admin' ? 'female' : 'male'}&seed=${user?.id}`}
                />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.role}</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 w-full min-w-0">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-primary" />
              <h1 className="text-lg font-medium tracking-tight text-foreground hidden sm:block">
                {filteredNavItems.find((i) => i.path === location.pathname)?.title || 'Painel'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in-up">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

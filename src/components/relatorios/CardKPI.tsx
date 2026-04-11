import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardKPIProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function CardKPI({ title, value, description, icon, trend, className }: CardKPIProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p
            className={cn('text-xs mt-1', {
              'text-green-600': trend === 'up',
              'text-red-600': trend === 'down',
              'text-muted-foreground': trend === 'neutral' || !trend,
            })}
          >
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

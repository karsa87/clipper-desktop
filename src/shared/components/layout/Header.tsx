import { useLocation } from 'react-router-dom'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/utils'
import { useBackendStatus } from '@/shared/hooks/useBackendStatus'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'

const ROUTE_LABELS: Record<string, string> = {
  '/':           'Dashboard',
  '/projects':   'Projects',
  '/videos':     'Videos',
  '/clips':      'Clips',
  '/transcript': 'Transcript',
  '/hooks':      'Hook Detection',
  '/exports':    'Exports',
  '/settings':   'Settings',
}

export function Header() {
  const location = useLocation()
  const qc = useQueryClient()
  const { online } = useBackendStatus()

  const basePath = '/' + location.pathname.split('/')[1]
  const label = ROUTE_LABELS[basePath] ?? 'Clipper'

  return (
    <TooltipProvider>
      <header className="h-16 flex items-center justify-between px-6 border-b border-border/80 glass shrink-0 drag-region sticky top-0 z-20">
        <div className="flex items-center gap-3 no-drag">
          <h1 className="text-base font-semibold tracking-tight text-foreground">{label}</h1>
        </div>

        <div className="flex items-center gap-3 no-drag">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors shadow-2xs',
                online
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              )}>
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', online ? 'bg-success animate-pulse' : 'bg-destructive')} />
                {online ? 'Backend Connected' : 'Engine Offline'}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {online ? 'Backend API is reachable' : 'Cannot reach backend — check Settings'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => qc.invalidateQueries()}>
                <RefreshCw size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh all data</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  )
}

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
      <header className="h-14 flex items-center justify-between px-5 border-b border-border glass shrink-0 drag-region sticky top-0 z-10">
        <h1 className="text-sm font-semibold no-drag">{label}</h1>

        <div className="flex items-center gap-2 no-drag">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                online
                  ? 'border-success/30 bg-success/5 text-success'
                  : 'border-destructive/30 bg-destructive/5 text-destructive'
              )}>
                {online ? <Wifi size={11} /> : <WifiOff size={11} />}
                {online ? 'Connected' : 'Disconnected'}
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

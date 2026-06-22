import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Video, Scissors,
  FileText, Zap, Download, Settings, ChevronLeft, ChevronRight, Clapperboard,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { useUIStore } from '@/store/ui.store'
import { useProjectStore } from '@/store/projects.store'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/projects',   icon: FolderOpen,      label: 'Projects'       },
  { to: '/videos',     icon: Video,           label: 'Videos'         },
  { to: '/clips',      icon: Scissors,        label: 'Clips'          },
  { to: '/transcript', icon: FileText,        label: 'Transcript'     },
  { to: '/hooks',      icon: Zap,             label: 'Hook Detection' },
  { to: '/exports',    icon: Download,        label: 'Exports'        },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { projects } = useProjectStore()

  return (
    <TooltipProvider delayDuration={100}>
      <aside className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-200 shrink-0',
        sidebarCollapsed ? 'w-14' : 'w-56'
      )}>

        {/* Logo */}
        <div className={cn(
          'flex items-center h-14 px-3 border-b border-border drag-region shrink-0',
          sidebarCollapsed ? 'justify-center' : 'gap-2.5'
        )}>
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 no-drag glow-primary">
            <Clapperboard size={14} className="text-primary-foreground" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold no-drag">Clipper</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  {!sidebarCollapsed && label}
                </NavLink>
              </TooltipTrigger>
              {sidebarCollapsed && (
                <TooltipContent side="right">{label}</TooltipContent>
              )}
            </Tooltip>
          ))}

          {/* Projects quick list */}
          {!sidebarCollapsed && projects.length > 0 && (
            <div className="pt-4">
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Projects
              </p>
              {projects.slice(0, 6).map((p) => (
                <NavLink
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors truncate',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate">{p.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-2 border-t border-border space-y-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <Settings size={15} />
                {!sidebarCollapsed && 'Settings'}
              </NavLink>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>

          <button
            onClick={toggleSidebar}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            {sidebarCollapsed
              ? <ChevronRight size={15} />
              : <><ChevronLeft size={15} /><span>Collapse</span></>
            }
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

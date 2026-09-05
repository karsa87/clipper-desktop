import { useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  FolderOpen,
  Video,
  Scissors,
  FileText,
  Zap,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/shared/utils'
import { useUIStore } from '@/store/ui.store'
import { useProjectStore } from '@/store/projects.store'
import { videoService } from '@/services/video.service'
import { useBackendStatus } from '@/shared/hooks/useBackendStatus'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '../ui/tooltip'

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
  badge?: number | string
  badgeColor?: string
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export function Sidebar() {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { projects } = useProjectStore()
  const { online } = useBackendStatus()

  // Video count for badge
  const { data: videosData } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  const videoCount = videosData?.total ?? videosData?.items?.length ?? 0

  const navSections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/projects', icon: FolderOpen, label: 'Projects' },
      ],
    },
    {
      title: 'Studio',
      items: [
        {
          to: '/videos',
          icon: Video,
          label: 'Videos',
          badge: videoCount > 0 ? videoCount : undefined,
        },
        { to: '/clips', icon: Scissors, label: 'Clips Studio' },
        { to: '/transcript', icon: FileText, label: 'Subtitles & Script' },
        { to: '/hooks', icon: Zap, label: 'Viral Hooks' },
        { to: '/exports', icon: Download, label: 'Exports' },
      ],
    },
  ]

  const isRouteActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/' || location.pathname === ''
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          'flex flex-col h-full bg-[#0B0D14] border-r border-white/[0.08] transition-all duration-200 shrink-0 z-20 select-none',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex items-center h-16 px-4 border-b border-white/[0.08] shrink-0',
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between'
          )}
        >
          <Link
            to="/"
            className={cn(
              'flex items-center gap-3 group transition-transform active:scale-95',
              sidebarCollapsed && 'justify-center'
            )}
          >
            {/* Logo Squircle */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25 border border-white/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <Clapperboard size={18} className="text-white drop-shadow-sm" />
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white font-sans">
                    Clipper
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                    Studio
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-medium tracking-tight truncate">
                  AI Video Engine
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!sidebarCollapsed && section.title && (
                <div className="px-3 pb-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {section.title}
                  </span>
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isRouteActive(item.to)
                  const Icon = item.icon

                  const linkContent = (
                    <Link
                      to={item.to}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative',
                        sidebarCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'h-9',
                        active
                          ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.1] shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                      )}
                    >
                      {/* Active Indicator Bar (Expanded mode) */}
                      {active && !sidebarCollapsed && (
                        <span className="absolute left-1 w-1 h-3.5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500" />
                      )}

                      {/* Icon */}
                      <Icon
                        size={16}
                        className={cn(
                          'shrink-0 transition-colors',
                          active
                            ? 'text-violet-400'
                            : 'text-zinc-400 group-hover:text-zinc-200'
                        )}
                      />

                      {/* Label & Badge */}
                      {!sidebarCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0 pl-0.5">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                'text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold',
                                active
                                  ? 'bg-violet-500/30 text-violet-200 border border-violet-500/40'
                                  : 'bg-zinc-800 text-zinc-400 border border-white/5'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  )

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.to}>{linkContent}</div>
                })}
              </div>
            </div>
          ))}

          {/* Projects Quick List */}
          {!sidebarCollapsed && projects.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1">
              <div className="px-3 pb-1 pt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Projects
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  {projects.length}
                </span>
              </div>

              <div className="space-y-0.5">
                {projects.slice(0, 5).map((p) => {
                  const active = location.pathname === `/projects/${p.id}`
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors truncate',
                        active
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white/10"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Area: Settings & Engine Status & Collapse */}
        <div className="p-2.5 border-t border-white/[0.08] bg-black/20 space-y-1">
          {/* Settings Nav */}
          {(() => {
            const active = isRouteActive('/settings')
            const settingsLink = (
              <Link
                to="/settings"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                  sidebarCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'h-9',
                  active
                    ? 'bg-white/[0.08] text-white font-semibold border border-white/[0.1]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                )}
              >
                <Settings
                  size={16}
                  className={cn(
                    'shrink-0 transition-colors',
                    active ? 'text-violet-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  )}
                />
                {!sidebarCollapsed && <span>Settings</span>}
              </Link>
            )

            if (sidebarCollapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{settingsLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    Settings
                  </TooltipContent>
                </Tooltip>
              )
            }
            return settingsLink
          })()}

          {/* Engine Status Pill */}
          {!sidebarCollapsed && (
            <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    online
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse'
                      : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                  )}
                />
                <span className="text-[11px] font-medium text-zinc-300">
                  {online ? 'Engine Active' : 'Engine Offline'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">v2.0</span>
            </div>
          )}

          {/* Collapse / Expand Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors',
              sidebarCollapsed && 'justify-center px-0 h-9 w-10 mx-auto'
            )}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={15} />
            ) : (
              <>
                <ChevronLeft size={15} />
                <span className="text-[11px]">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

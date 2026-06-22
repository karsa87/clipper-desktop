import { useQuery } from '@tanstack/react-query'
import { Video, Scissors, FolderOpen, Zap, ArrowRight, TrendingUp, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { videoService } from '@/services/video.service'
import { useProjectStore } from '@/store/projects.store'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { SkeletonStats, SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { formatDuration, formatRelativeTime } from '@/shared/utils'

function StatCard({ icon: Icon, label, value, delta, color, to }: {
  icon: React.ElementType; label: string; value: number; delta?: string; color: string; to: string
}) {
  return (
    <Link to={to}>
      <Card className="hover:border-border/80 transition-all group cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon size={17} />
            </div>
            <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {delta && <p className="text-xs text-success mt-1 flex items-center gap-1"><TrendingUp size={11}/>{delta}</p>}
        </CardContent>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  const { projects } = useProjectStore()

  const { data, isLoading } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
    refetchInterval: 8000,
  })

  const videos = data?.items ?? []
  const completed = videos.filter(v => v.status === 'completed').length
  const processing = videos.filter(v => ['transcribing','analyzing','clipping'].includes(v.status)).length
  const recent = [...videos]
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-up">
      {/* Stats */}
      {isLoading ? <SkeletonStats /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={FolderOpen}  label="Projects"   value={projects.length} color="bg-primary/10 text-primary"     to="/projects" />
          <StatCard icon={Video}       label="Videos"     value={videos.length}   color="bg-blue-500/10 text-blue-400"   to="/videos" />
          <StatCard icon={Scissors}    label="Completed"  value={completed}       color="bg-success/10 text-success"     to="/clips" />
          <StatCard icon={Zap}         label="Processing" value={processing}      color="bg-warning/10 text-warning"     to="/videos" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Videos */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              <CardTitle>Recent Videos</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/videos">View all <ArrowRight size={12} /></Link>
            </Button>
          </CardHeader>

          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Video size={22} />}
              title="No videos yet"
              description="Upload a video to start the AI clipping pipeline."
              action={<Button size="sm" asChild><Link to="/videos">Upload Video</Link></Button>}
              className="py-10"
            />
          ) : (
            <div className="divide-y divide-border">
              {recent.map((v) => (
                <Link key={v.id} to={`/videos/${v.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Video size={13} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{v.filename}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {v.duration_seconds ? formatDuration(v.duration_seconds) : '—'}
                      {' · '}{formatRelativeTime(v.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Pipeline Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { n:'01', label:'Upload Video',    to:'/videos',     desc:'Add MP4 source file' },
              { n:'02', label:'Transcribe',       to:'/transcript', desc:'Speech to text with Whisper' },
              { n:'03', label:'Detect Hooks',     to:'/hooks',      desc:'AI finds viral moments' },
              { n:'04', label:'Extract Clips',    to:'/videos',     desc:'FFmpeg precision cuts' },
              { n:'05', label:'Export',           to:'/exports',    desc:'Subtitles + metadata' },
            ].map((s) => (
              <Link key={s.n} to={s.to}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <span className="text-[10px] font-mono text-muted-foreground mt-0.5 w-5 shrink-0">{s.n}</span>
                <div>
                  <p className="text-xs font-medium group-hover:text-primary transition-colors">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

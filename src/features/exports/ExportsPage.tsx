import { useQuery } from '@tanstack/react-query'
import { Download, Package, Video, Search } from 'lucide-react'
import { useState } from 'react'
import { videoService } from '@/services/video.service'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { useSettingsStore } from '@/store/settings.store'
import { formatRelativeTime, formatDuration, formatTimestamp, platformLabel } from '@/shared/utils'
import type { Clip, Video as VideoType } from '@/types'

export function ExportsPage() {
  const { backendUrl } = useSettingsStore()
  const [search, setSearch] = useState('')

  const { data: videosData, isLoading } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  const videos = videosData?.items ?? []
  const completedVideos = videos.filter(v => v.status === 'completed')

  const { data: allClips, isLoading: clipsLoading } = useQuery({
    queryKey: ['all-exported-clips'],
    queryFn: async () => {
      const results = await Promise.all(
        completedVideos.map(async (v) => {
          try {
            const clips = await videoService.listClips(v.id)
            return clips.items.filter(c => c.status === 'exported').map(c => ({ clip: c, video: v }))
          } catch { return [] }
        })
      )
      return results.flat()
    },
    enabled: completedVideos.length > 0,
  })

  const exported = (allClips ?? []).filter(({ clip }) =>
    !search || clip.title?.toLowerCase().includes(search.toLowerCase())
  )

  const loading = isLoading || clipsLoading

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div>
        <h2 className="text-sm font-semibold">Exports</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{exported.length} exported clip{exported.length !== 1 ? 's' : ''}</p>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <Input leftIcon={<Search size={13} />} placeholder="Search exports…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? <SkeletonTable rows={5} /> : exported.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="No exports yet" description="Export clips from the Clips page to see them here." className="py-12" />
        ) : (
          <div className="divide-y divide-border">
            {exported.map(({ clip, video }: { clip: Clip; video: VideoType }) => (
              <div key={clip.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Package size={14} className="text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{clip.title ?? `Clip at ${formatTimestamp(clip.start_time)}`}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Video size={10} /><span className="truncate max-w-[140px]">{video.filename}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{formatDuration(clip.end_time - clip.start_time)}</span>
                    <span className="text-[11px] text-muted-foreground">{platformLabel(clip.target_platform)}</span>
                    <span className="text-[11px] text-muted-foreground">{formatRelativeTime(clip.created_at)}</span>
                  </div>
                </div>
                <StatusBadge status="exported" />
                {clip.file_path && (
                  <a href={`${backendUrl}/api/v1/clips/${clip.id}/download`} download
                    target="_blank"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

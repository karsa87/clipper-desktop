import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Scissors, Download, Upload, Play, Tag, Hash, Search } from 'lucide-react'
import { videoService, clipService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { formatTimestamp, formatDuration, platformLabel } from '@/shared/utils'
import { useSettingsStore } from '@/store/settings.store'

export function ClipsPage() {
  const [params] = useSearchParams()
  const videoIdParam = params.get('videoId')
  const { backendUrl } = useSettingsStore()
  const qc = useQueryClient()
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdParam)
  const [expandedClip, setExpandedClip] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: videos } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  const { data: clipsData, isLoading } = useQuery({
    queryKey: ['clips', selectedVideoId],
    queryFn: () => videoService.listClips(selectedVideoId!),
    enabled: !!selectedVideoId,
    refetchInterval: (q) => {
      const items = q.state.data?.items ?? []
      return items.some(c => ['pending','extracted'].includes(c.status)) ? 3000 : false
    },
  })

  const exportMutation = useMutation({
    mutationFn: (clipId: string) => clipService.export(clipId, {
      burn_subtitles: true, generate_title: true, generate_caption: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clips', selectedVideoId] })
      toast.success('Clip exported')
    },
    onError: (e: Error) => toast.error('Export failed', e.message),
  })

  const clips = (clipsData?.items ?? []).filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full overflow-hidden animate-fade-up">
      <div className="w-56 border-r border-border overflow-y-auto shrink-0">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-xs font-semibold">Videos</p>
        </div>
        <div className="py-1">
          {(videos?.items ?? []).map((v) => (
            <button key={v.id} onClick={() => setSelectedVideoId(v.id)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                selectedVideoId === v.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <p className="truncate font-medium">{v.filename}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedVideoId ? (
          <EmptyState icon={<Scissors size={22} />} title="Select a video" description="Choose a video to view its clips." className="flex-1 flex flex-col justify-center" />
        ) : (
          <>
            <div className="px-5 py-3 border-b border-border shrink-0 space-y-3">
              <div>
                <p className="text-xs font-semibold">Clips</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{clips.length} clip{clips.length !== 1 ? 's' : ''}</p>
              </div>
              <Input leftIcon={<Search size={13} />} placeholder="Search clips by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {isLoading ? <SkeletonTable rows={4} /> : clips.length === 0 ? (
                <EmptyState icon={<Scissors size={22} />} title="No clips yet" description="Extract clips from detected hooks in the Video detail page." />
              ) : clips.map((clip) => (
                <Card key={clip.id} className="overflow-hidden hover:border-border/80 transition-colors">
                  <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedClip(expandedClip === clip.id ? null : clip.id)}>
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Play size={14} className="text-muted-foreground ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{clip.title ?? `Clip ${formatTimestamp(clip.start_time)}`}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatTimestamp(clip.start_time)} → {formatTimestamp(clip.end_time)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatDuration(clip.end_time - clip.start_time)}</span>
                        <span className="text-[11px] text-muted-foreground">{platformLabel(clip.target_platform)}</span>
                      </div>
                    </div>
                    <StatusBadge status={clip.status} />
                    {(clip.status === 'extracted' || clip.status === 'subtitled') ? (
                      <Button size="sm" loading={exportMutation.isPending && exportMutation.variables === clip.id}
                        onClick={(e) => { e.stopPropagation(); exportMutation.mutate(clip.id) }}>
                        <Upload size={11} /> Export
                      </Button>
                    ) : clip.status === 'exported' && clip.file_path ? (
                      <a href={`${backendUrl}/api/v1/clips/${clip.id}/download`} download
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-secondary transition-colors"
                        target='_blank'>
                        <Download size={11} /> Download
                      </a>
                    ) : null}
                  </div>

                  {expandedClip === clip.id && (
                    <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20 animate-fade-in">
                      {clip.caption && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Tag size={11} className="text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Caption</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{clip.caption}</p>
                        </div>
                      )}
                      {clip.hashtags.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Hash size={11} className="text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Hashtags</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {clip.hashtags.map((t, i) => (
                              <span key={i} className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">#{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

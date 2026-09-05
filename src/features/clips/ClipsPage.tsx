import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Scissors,
  Download,
  Upload,
  Play,
  Tag,
  Hash,
  Search,
  Sliders,
  Tv,
  Smartphone,
  Eye,
  FileDown,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { videoService, clipService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { formatTimestamp, formatDuration, platformLabel } from '@/shared/utils'
import { useSettingsStore } from '@/store/settings.store'
import type { Clip } from '@/types'
import { ClipPreviewModal } from './ClipPreviewModal'
import { ClipDeleteDialog } from './ClipDeleteDialog'

export function ClipsPage() {
  const [params] = useSearchParams()
  const videoIdParam = params.get('videoId')
  const { backendUrl } = useSettingsStore()
  const qc = useQueryClient()
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdParam)
  const [expandedClip, setExpandedClip] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [aspectFilter, setAspectFilter] = useState<'all' | '9:16' | '16:9'>('all')

  // Preview & Delete modal state
  const [previewClip, setPreviewClip] = useState<Clip | null>(null)
  const [clipToDelete, setClipToDelete] = useState<Clip | null>(null)

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
      return items.some((c) => ['pending', 'extracted'].includes(c.status)) ? 3000 : false
    },
  })

  const exportMutation = useMutation({
    mutationFn: (clipId: string) =>
      clipService.export(clipId, {
        burn_subtitles: true,
        generate_title: true,
        generate_caption: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clips', selectedVideoId] })
      toast.success('Clip exported', 'Subtitles burned in and video ready for download.')
      if (previewClip) {
        setPreviewClip(null)
      }
    },
    onError: (e: Error) => toast.error('Export failed', e.message),
  })

  const rawClips = clipsData?.items ?? []

  const clips = rawClips.filter((c) => {
    const matchesSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase())
    const isVertical = [
      'youtube_shorts',
      'tiktok',
      'instagram_reels',
      'facebook_reels',
    ].includes(c.target_platform)

    if (!matchesSearch) return false
    if (aspectFilter === '9:16') return isVertical
    if (aspectFilter === '16:9') return !isVertical
    return true
  })

  return (
    <div className="flex h-full overflow-hidden bg-background animate-fade-up">
      {/* Left Column: Videos List */}
      <div className="w-64 border-r border-border/80 bg-card/30 backdrop-blur-xl flex flex-col shrink-0">
        <div className="px-4 py-3.5 border-b border-border/80">
          <p className="text-xs font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
            <Layers size={13} className="text-primary" /> Source Videos
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Select a video to view clips</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(videos?.items ?? []).map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVideoId(v.id)}
              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                selectedVideoId === v.id
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-secondary/80 flex items-center justify-center shrink-0 mt-0.5">
                <Scissors size={12} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{v.title || v.filename}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  {v.duration_seconds ? formatDuration(v.duration_seconds) : 'Ready'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Column: Clips Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedVideoId ? (
          <EmptyState
            icon={<Scissors size={28} className="text-primary" />}
            title="Select a Video"
            description="Choose a video from the sidebar to inspect its extracted clips and previews."
            className="flex-1 flex flex-col justify-center"
          />
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="px-6 py-3.5 border-b border-border/80 bg-card/40 backdrop-blur-md shrink-0 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" /> Clips Studio
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {clips.length} clip{clips.length !== 1 ? 's' : ''} available · Preview angle &
                  safe zones before final export
                </p>
              </div>

              {/* Filters & Aspect Ratio Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/70 text-xs">
                  <button
                    onClick={() => setAspectFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                      aspectFilter === 'all'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAspectFilter('9:16')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium ${
                      aspectFilter === '9:16'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Smartphone size={11} /> 9:16 Portrait
                  </button>
                  <button
                    onClick={() => setAspectFilter('16:9')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium ${
                      aspectFilter === '16:9'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Tv size={11} /> 16:9 Landscape
                  </button>
                </div>
              </div>
            </div>

            {/* Search Subheader */}
            <div className="px-6 py-2.5 border-b border-border/60 bg-muted/20">
              <Input
                leftIcon={<Search size={13} className="text-muted-foreground" />}
                placeholder="Search clips by title, caption, or keyword…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-xl text-xs bg-card/80 max-w-md"
              />
            </div>

            {/* Clips Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {isLoading ? (
                <SkeletonTable rows={4} />
              ) : clips.length === 0 ? (
                <EmptyState
                  icon={<Scissors size={28} className="text-muted-foreground" />}
                  title="No Clips Match Criteria"
                  description="Extract clips from detected hooks on the Video Details page."
                />
              ) : (
                clips.map((clip) => {
                  const isVertical = [
                    'youtube_shorts',
                    'tiktok',
                    'instagram_reels',
                    'facebook_reels',
                  ].includes(clip.target_platform)

                  return (
                    <Card
                      key={clip.id}
                      className="glass-card shadow-sm rounded-2xl border border-border/70 overflow-hidden hover:border-border transition-all"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Play / Preview Thumbnail Button */}
                        <button
                          onClick={() => setPreviewClip(clip)}
                          className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 hover:scale-105 hover:bg-primary/20 transition-all shadow-xs"
                          title="Preview Angle & Subtitles"
                        >
                          <Play size={16} className="fill-current ml-0.5" />
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-foreground truncate">
                              {clip.title ?? `Clip ${formatTimestamp(clip.start_time)}`}
                            </p>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
                              {isVertical ? <Smartphone size={9} /> : <Tv size={9} />}
                              {isVertical ? '9:16' : '16:9'}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <span className="font-mono text-foreground font-medium">
                              {formatTimestamp(clip.start_time)} → {formatTimestamp(clip.end_time)}
                            </span>
                            <span>•</span>
                            <span>{formatDuration(clip.end_time - clip.start_time)}</span>
                            <span>•</span>
                            <span>{platformLabel(clip.target_platform)}</span>
                            {clip.framing_mode && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary uppercase">
                                  {clip.framing_mode}
                                  {clip.framing_mode === 'auto' && clip.pan_style && ` • ${clip.pan_style}`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <StatusBadge status={clip.status} />

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewClip(clip)}
                            className="h-8 rounded-xl text-xs flex items-center gap-1.5 bg-card/80"
                          >
                            <Eye size={12} /> Preview
                          </Button>

                          {(clip.status === 'extracted' || clip.status === 'subtitled') && (
                            <Button
                              size="sm"
                              loading={
                                exportMutation.isPending &&
                                exportMutation.variables === clip.id
                              }
                              onClick={() => exportMutation.mutate(clip.id)}
                              className="h-8 rounded-xl text-xs font-semibold px-3 gradient-brand text-white shadow-sm flex items-center gap-1.5"
                            >
                              <Upload size={12} /> Export
                            </Button>
                          )}

                          {clip.status === 'exported' && (
                            <a
                              href={clipService.getClipDownloadUrl(clip.id)}
                              download
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                            >
                              <Download size={12} /> Download
                            </a>
                          )}

                          {/* Delete Clip Button */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setClipToDelete(clip)}
                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete clip and local video files"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Caption / Hashtags */}
                      {(clip.caption || clip.hashtags.length > 0) && (
                        <div className="border-t border-border/60 px-5 py-3 bg-muted/20 text-xs space-y-2">
                          {clip.caption && (
                            <p className="text-muted-foreground leading-relaxed">
                              {clip.caption}
                            </p>
                          )}
                          {clip.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {clip.hashtags.map((t, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono text-primary"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Interactive Clip Preview Studio Modal */}
      <ClipPreviewModal
        clip={previewClip}
        open={!!previewClip}
        onOpenChange={(o) => !o && setPreviewClip(null)}
        onExport={(id) => exportMutation.mutate(id)}
        isExporting={exportMutation.isPending}
      />

      {/* Delete Clip Dialog */}
      <ClipDeleteDialog
        clip={clipToDelete}
        open={!!clipToDelete}
        onOpenChange={(o) => !o && setClipToDelete(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['clips', selectedVideoId] })
        }}
      />
    </div>
  )
}

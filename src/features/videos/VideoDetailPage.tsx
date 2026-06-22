import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, Zap, Scissors, Video, Clock, ChevronRight, Play, RefreshCw, Info,
} from 'lucide-react'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { StatusBadge, ScoreBadge } from '@/shared/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { SkeletonCard } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { Progress } from '@/shared/components/ui/progress'
import { formatDuration, formatTimestamp, formatRelativeTime, platformLabel } from '@/shared/utils'
import type { TargetPlatform } from '@/types'

const PLATFORMS: { value: TargetPlatform; label: string }[] = [
  { value: 'youtube_shorts',  label: 'YouTube Shorts'  },
  { value: 'tiktok',          label: 'TikTok'          },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'facebook_reels',  label: 'Facebook Reels'  },
]

const PIPELINE_STAGES = ['uploaded','transcribed','analyzed','completed']
function pipelineProgress(status: string) {
  const idx = PIPELINE_STAGES.indexOf(status)
  return idx < 0 ? (status === 'failed' ? 100 : 0) : Math.round(((idx) / (PIPELINE_STAGES.length - 1)) * 100)
}

export function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [selectedHooks, setSelectedHooks] = useState<string[]>([])
  const [platform, setPlatform] = useState<TargetPlatform>('youtube_shorts')

  const { data: video, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoService.get(id!),
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s && ['transcribing','analyzing','clipping'].includes(s) ? 3000 : false
    },
  })

  const { data: transcript } = useQuery({
    queryKey: ['transcript', id],
    queryFn: () => videoService.getTranscript(id!),
    enabled: !!video && !['uploaded','transcribing'].includes(video.status),
    retry: false,
  })

  const { data: hooksData } = useQuery({
    queryKey: ['hooks', id],
    queryFn: () => videoService.listHooks(id!),
    enabled: !!video && ['analyzed','clipping','completed'].includes(video.status),
    retry: false,
  })

  const { data: clipsData } = useQuery({
    queryKey: ['clips', id],
    queryFn: () => videoService.listClips(id!),
    enabled: !!video && ['clipping','completed'].includes(video.status),
    retry: false,
  })

  const transcribeMutation = useMutation({
    mutationFn: () => videoService.transcribe(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['video', id] }); toast.success('Transcription started') },
    onError: (e: Error) => toast.error('Transcription failed', e.message),
  })

  const detectHooksMutation = useMutation({
    mutationFn: () => videoService.detectHooks(id!, { max_hooks: 5, min_duration: 15, max_duration: 90 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] })
      qc.invalidateQueries({ queryKey: ['hooks', id] })
      toast.success('Hooks detected', `Found ${hooksData?.total ?? 0} viral moments`)
    },
    onError: (e: Error) => toast.error('Hook detection failed', e.message),
  })

  const extractMutation = useMutation({
    mutationFn: () => videoService.extractClips(id!, {
      hook_ids: selectedHooks.length > 0 ? selectedHooks : (hooksData?.items.map(h => h.id) ?? []),
      target_platform: platform,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] })
      qc.invalidateQueries({ queryKey: ['clips', id] })
      toast.success('Clips extracted')
    },
    onError: (e: Error) => toast.error('Extraction failed', e.message),
  })

  const toggleHook = (hid: string) =>
    setSelectedHooks(p => p.includes(hid) ? p.filter(h => h !== hid) : [...p, hid])

  if (isLoading) return <div className="p-6 space-y-4"><SkeletonCard /><SkeletonCard /></div>
  if (!video) return null

  const hooks = hooksData?.items ?? []
  const clips = clipsData?.items ?? []
  const progress = pipelineProgress(video.status)
  const isFailed = video.status === 'failed'

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto animate-fade-up">
      <Link to="/videos" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={13} /> Back to Videos
      </Link>

      {/* Video header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Video size={20} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">{video.filename}</h1>
              <div className="flex items-center flex-wrap gap-3 mt-1.5">
                {video.duration_seconds && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock size={11} />{formatDuration(video.duration_seconds)}
                  </span>
                )}
                {video.width && video.height && (
                  <span className="text-[11px] text-muted-foreground">{video.width}×{video.height}</span>
                )}
                {video.fps && <span className="text-[11px] text-muted-foreground">{Math.round(video.fps)} fps</span>}
                <span className="text-[11px] text-muted-foreground">{formatRelativeTime(video.created_at)}</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <StatusBadge status={video.status} />
                  <span className="text-[11px] text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={isFailed ? 100 : progress}
                  className={isFailed ? '[&>div]:bg-destructive' : ''} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Transcribe */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
              <FileText size={12} className="text-blue-400" />
            </div>
            <CardTitle>Transcription</CardTitle>
            {transcript && <StatusBadge status="transcribed" />}
          </div>
          <Button size="sm" variant="outline"
            loading={transcribeMutation.isPending}
            onClick={() => transcribeMutation.mutate()}
            disabled={video.status === 'transcribing'}
          >
            <RefreshCw size={11} />
            {transcript ? 'Re-transcribe' : 'Transcribe'}
          </Button>
        </CardHeader>
        {transcript && (
          <CardContent className="pt-0">
            <div className="rounded-lg bg-muted/50 p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{transcript.language}</span>
                <span className="text-[10px] text-muted-foreground">{transcript.segments.length} segments</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{transcript.full_text}</p>
              <Link to={`/transcript?videoId=${id}`}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2">
                View full transcript <ChevronRight size={11} />
              </Link>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Step 2: Hooks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-warning/10 flex items-center justify-center">
              <Zap size={12} className="text-warning" />
            </div>
            <CardTitle>Hook Detection</CardTitle>
            {hooks.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {hooks.length} found
              </span>
            )}
          </div>
          <Button size="sm" variant="outline"
            loading={detectHooksMutation.isPending}
            onClick={() => detectHooksMutation.mutate()}
            disabled={!transcript || video.status === 'analyzing'}
          >
            <Zap size={11} />
            {hooks.length > 0 ? 'Re-detect' : 'Detect Hooks'}
          </Button>
        </CardHeader>

        {hooks.length > 0 && (
          <CardContent className="pt-0 space-y-2">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info size={11}/> Select hooks to extract. All hooks will be used if none selected.
            </p>
            {hooks.map((hook) => (
              <div key={hook.id} onClick={() => toggleHook(hook.id)}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedHooks.includes(hook.id)
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-border/80 hover:bg-muted/40'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  selectedHooks.includes(hook.id) ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {selectedHooks.includes(hook.id) && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {formatTimestamp(hook.start_time)} → {formatTimestamp(hook.end_time)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({Math.round(hook.end_time - hook.start_time)}s)
                    </span>
                    <ScoreBadge score={hook.score} />
                  </div>
                  <p className="text-xs text-muted-foreground">{hook.reason}</p>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Step 3: Extract */}
      {hooks.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Scissors size={12} className="text-primary" />
              </div>
              <CardTitle>Extract Clips</CardTitle>
              {clips.length > 0 && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {clips.length} clips
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-3">
              <Select value={platform} onValueChange={(v) => setPlatform(v as TargetPlatform)}>
                <SelectTrigger className="max-w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button loading={extractMutation.isPending} onClick={() => extractMutation.mutate()}>
                <Scissors size={13} />
                Extract {selectedHooks.length > 0 ? `${selectedHooks.length} Selected` : 'All'}
              </Button>
            </div>

            {clips.length > 0 && (
              <div className="space-y-2">
                {clips.map(clip => (
                  <div key={clip.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Play size={11} className="text-muted-foreground ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {clip.title ?? `${formatTimestamp(clip.start_time)} → ${formatTimestamp(clip.end_time)}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{platformLabel(clip.target_platform)}</p>
                    </div>
                    <StatusBadge status={clip.status} />
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link to={`/clips?videoId=${id}`}><ChevronRight size={13}/></Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

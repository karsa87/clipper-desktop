import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  Zap,
  Scissors,
  Video as VideoIcon,
  Clock,
  ChevronRight,
  Play,
  RefreshCw,
  Info,
  Edit3,
  Trash2,
  Globe,
  HardDrive,
  User,
  Users,
  AtSign,
  Sparkles,
} from 'lucide-react'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { StatusBadge, ScoreBadge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { SkeletonCard } from '@/shared/components/ui/skeleton'
import { Progress } from '@/shared/components/ui/progress'
import {
  formatDuration,
  formatTimestamp,
  formatRelativeTime,
  platformLabel,
} from '@/shared/utils'
import type { TargetPlatform } from '@/types'
import { VideoEditModal } from './VideoEditModal'
import { VideoDeleteDialog } from './VideoDeleteDialog'
import { VideoPlayerModal } from './VideoPlayerModal'

const PLATFORMS: { value: TargetPlatform; label: string }[] = [
  { value: 'youtube_shorts', label: 'YouTube Shorts' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'facebook_reels', label: 'Facebook Reels' },
]

const PIPELINE_STAGES = ['uploaded', 'transcribed', 'analyzed', 'completed']
function pipelineProgress(status: string) {
  const idx = PIPELINE_STAGES.indexOf(status)
  return idx < 0
    ? status === 'failed'
      ? 100
      : 0
    : Math.round((idx / (PIPELINE_STAGES.length - 1)) * 100)
}

export function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedHooks, setSelectedHooks] = useState<string[]>([])
  const [platform, setPlatform] = useState<TargetPlatform>('youtube_shorts')

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [playerModalOpen, setPlayerModalOpen] = useState(false)

  const { data: video, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: () => videoService.get(id!),
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s && ['queued', 'downloading', 'transcribing', 'analyzing', 'clipping'].includes(s)
        ? 3000
        : false
    },
  })

  const { data: transcript } = useQuery({
    queryKey: ['transcript', id],
    queryFn: () => videoService.getTranscript(id!),
    enabled: !!video && !['queued', 'downloading', 'uploaded', 'transcribing'].includes(video.status),
    retry: false,
  })

  const { data: hooksData } = useQuery({
    queryKey: ['hooks', id],
    queryFn: () => videoService.listHooks(id!),
    enabled: !!video && ['analyzed', 'clipping', 'completed'].includes(video.status),
    retry: false,
  })

  const { data: clipsData } = useQuery({
    queryKey: ['clips', id],
    queryFn: () => videoService.listClips(id!),
    enabled: !!video && ['clipping', 'completed'].includes(video.status),
    retry: false,
  })

  const transcribeMutation = useMutation({
    mutationFn: () => videoService.transcribe(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] })
      toast.success('Transcription started')
    },
    onError: (e: Error) => toast.error('Transcription failed', e.message),
  })

  const detectHooksMutation = useMutation({
    mutationFn: () =>
      videoService.detectHooks(id!, { max_hooks: 5, min_duration: 15, max_duration: 90 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] })
      qc.invalidateQueries({ queryKey: ['hooks', id] })
      toast.success('Hooks detected', `Found ${hooksData?.total ?? 0} viral moments`)
    },
    onError: (e: Error) => toast.error('Hook detection failed', e.message),
  })

  const extractMutation = useMutation({
    mutationFn: () =>
      videoService.extractClips(id!, {
        hook_ids:
          selectedHooks.length > 0
            ? selectedHooks
            : hooksData?.items.map((h) => h.id) ?? [],
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
    setSelectedHooks((p) => (p.includes(hid) ? p.filter((h) => h !== hid) : [...p, hid]))

  if (isLoading)
    return (
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  if (!video) return null

  const hooks = hooksData?.items ?? []
  const clips = clipsData?.items ?? []
  const progress = pipelineProgress(video.status)
  const isFailed = video.status === 'failed'

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto animate-fade-up">
      {/* Back link & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Videos
        </Link>

        <div className="flex items-center gap-2">
          {video.status !== 'queued' && video.status !== 'downloading' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setPlayerModalOpen(true)}
              className="h-8 rounded-xl text-xs font-semibold px-3 gradient-brand text-white shadow-sm flex items-center gap-1.5"
            >
              <Play size={13} className="fill-current" /> Play Video
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="h-8 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Edit3 size={13} /> Edit Details
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="h-8 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Trash2 size={13} /> Delete Video
          </Button>
        </div>
      </div>

      {/* Video Details Card with Context Metadata */}
      <Card className="glass-card shadow-xl rounded-2xl border border-border/80 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border/80 flex items-center justify-center shrink-0 shadow-sm text-primary">
              {video.source_type === 'url' ? <Globe size={24} /> : <HardDrive size={24} />}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                  {video.title || video.filename}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground uppercase">
                  {video.source_type}
                </span>
                <StatusBadge status={video.status} />
              </div>

              {/* Context badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {video.creator_account && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-secondary/80 text-secondary-foreground font-mono">
                    <AtSign size={11} /> {video.creator_account}
                  </span>
                )}
                {video.host_names && video.host_names.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <User size={11} /> Host: {video.host_names.join(', ')}
                  </span>
                )}
                {video.guest_stars && video.guest_stars.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-accent/10 text-accent border border-accent/20">
                    <Users size={11} /> Guests: {video.guest_stars.join(', ')}
                  </span>
                )}
              </div>

              {/* Technical video properties */}
              <div className="flex items-center flex-wrap gap-4 text-[11px] text-muted-foreground pt-1">
                {video.duration_seconds && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock size={12} /> {formatDuration(video.duration_seconds)}
                  </span>
                )}
                {video.width && video.height && (
                  <span className="font-mono">
                    {video.width}×{video.height}
                  </span>
                )}
                {video.fps && <span className="font-mono">{Math.round(video.fps)} fps</span>}
                <span>Ingested {formatRelativeTime(video.created_at)}</span>
              </div>

              {/* Progress Tracker */}
              <div className="mt-4 space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Pipeline Progress</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <Progress
                  value={isFailed ? 100 : progress}
                  className={isFailed ? '[&>div]:bg-destructive' : ''}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Transcription */}
      <Card className="glass-card shadow-md rounded-2xl border border-border/80">
        <CardHeader className="flex-row items-center justify-between py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText size={16} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">1. Speech Transcription</CardTitle>
              <p className="text-[11px] text-muted-foreground">Audio extraction & Whisper speech-to-text</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            loading={transcribeMutation.isPending}
            onClick={() => transcribeMutation.mutate()}
            disabled={video.status === 'transcribing' || ['queued', 'downloading'].includes(video.status)}
            className="h-8 rounded-xl text-xs"
          >
            <RefreshCw size={12} className="mr-1.5" />
            {transcript ? 'Re-transcribe' : 'Start Transcribe'}
          </Button>
        </CardHeader>
        {transcript && (
          <CardContent className="p-5">
            <div className="rounded-xl bg-muted/30 p-4 border border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted">
                  {transcript.language}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {transcript.segments.length} segments identified
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {transcript.full_text}
              </p>
              <Link
                to={`/transcript?videoId=${id}`}
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-2.5"
              >
                View full interactive transcript <ChevronRight size={13} />
              </Link>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Step 2: Hooks (Gemini AI Detection) */}
      <Card className="glass-card shadow-md rounded-2xl border border-border/80">
        <CardHeader className="flex-row items-center justify-between py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
              <Zap size={16} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                2. AI Viral Hook Detection
                {hooks.length > 0 && (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {hooks.length} hooks found
                  </span>
                )}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Gemini AI uses video title, host & guest context to discover viral moments
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            loading={detectHooksMutation.isPending}
            onClick={() => detectHooksMutation.mutate()}
            disabled={!transcript || video.status === 'analyzing'}
            className="h-8 rounded-xl text-xs"
          >
            <Sparkles size={12} className="mr-1.5 text-primary" />
            {hooks.length > 0 ? 'Re-detect Hooks' : 'Detect Hooks'}
          </Button>
        </CardHeader>

        {hooks.length > 0 && (
          <CardContent className="p-5 space-y-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info size={12} /> Select hooks to extract clips. All hooks will be extracted if none selected.
            </p>
            <div className="space-y-2">
              {hooks.map((hook) => (
                <div
                  key={hook.id}
                  onClick={() => toggleHook(hook.id)}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedHooks.includes(hook.id)
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border/70 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    <ScoreBadge score={hook.score} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-foreground">
                        {formatTimestamp(hook.start_time)} → {formatTimestamp(hook.end_time)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {Math.round(hook.end_time - hook.start_time)}s
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium italic">
                      "{hook.transcript_excerpt}"
                    </p>
                    <p className="text-[11px] text-muted-foreground">{hook.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Step 3: Extract Clips */}
      {hooks.length > 0 && (
        <Card className="glass-card shadow-md rounded-2xl border border-border/80">
          <CardHeader className="flex-row items-center justify-between py-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Scissors size={16} />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">3. Extract & Render Clips</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Export 9:16 vertical shorts with burned-in captions
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as TargetPlatform)}
              >
                <SelectTrigger className="max-w-56 h-9 rounded-xl text-xs bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                loading={extractMutation.isPending}
                onClick={() => extractMutation.mutate()}
                className="h-9 rounded-xl text-xs font-semibold px-4 gradient-brand text-white shadow-sm"
              >
                <Scissors size={13} className="mr-1.5" />
                Extract {selectedHooks.length > 0 ? `${selectedHooks.length} Selected` : 'All'}
              </Button>
            </div>

            {clips.length > 0 && (
              <div className="space-y-2 pt-2">
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/20"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Play size={13} className="ml-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {clip.title ??
                          `${formatTimestamp(clip.start_time)} → ${formatTimestamp(clip.end_time)}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {platformLabel(clip.target_platform)}
                      </p>
                    </div>
                    <StatusBadge status={clip.status} />
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link to={`/clips?videoId=${id}`}>
                        <ChevronRight size={14} />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <VideoEditModal
        video={video}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['video', id] })
        }}
      />

      <VideoDeleteDialog
        video={video}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['videos'] })
          navigate('/videos')
        }}
      />

      <VideoPlayerModal
        video={video}
        open={playerModalOpen}
        onOpenChange={setPlayerModalOpen}
      />
    </div>
  )
}

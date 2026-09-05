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
  Eye,
  Download,
} from 'lucide-react'
import { clipService, videoService } from '@/services/video.service'
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
import type { Clip, FramingMode, PanStyle, TargetPlatform } from '@/types'
import { VideoEditModal } from './VideoEditModal'
import { VideoDeleteDialog } from './VideoDeleteDialog'
import { VideoPlayerModal } from './VideoPlayerModal'
import { ClipPreviewModal } from '@/features/clips/ClipPreviewModal'
import { ClipDeleteDialog } from '@/features/clips/ClipDeleteDialog'

const PLATFORMS: { value: TargetPlatform; label: string; aspect: string }[] = [
  { value: 'youtube_shorts', label: 'YouTube Shorts (9:16)', aspect: '9:16' },
  { value: 'tiktok', label: 'TikTok (9:16)', aspect: '9:16' },
  { value: 'instagram_reels', label: 'Instagram Reels (9:16)', aspect: '9:16' },
  { value: 'facebook_reels', label: 'Facebook Reels (9:16)', aspect: '9:16' },
  { value: 'youtube_highlight', label: 'YouTube Highlight (16:9 Landscape)', aspect: '16:9' },
  { value: 'bilibili', label: 'Bilibili Clip (16:9 Landscape)', aspect: '16:9' },
  { value: 'standard_landscape', label: 'Standard Landscape (16:9)', aspect: '16:9' },
]

const FRAMING_OPTIONS: { value: FramingMode; label: string; desc: string }[] = [
  { value: 'auto', label: '⚡ Auto-Pan (AI Tracking)', desc: 'Lacak & geser mulus ke pembicara' },
  { value: 'split', label: '👥 Split-Screen', desc: 'Stacked atas & bawah 2-tier' },
  { value: 'left', label: '👤 Fokus Kiri', desc: 'Terkunci di host kiri' },
  { value: 'center', label: '👤 Fokus Tengah', desc: 'Terkunci di tengah' },
  { value: 'right', label: '👤 Fokus Kanan', desc: 'Terkunci di guest kanan' },
]

const PAN_STYLE_OPTIONS: { value: PanStyle; label: string; speed: string; desc: string }[] = [
  { value: 'snappy', label: '⚡ Snappy Cinematic', speed: '0.35s', desc: 'Gesit & dinamis (Rekomendasi FYP)' },
  { value: 'smooth', label: '🎬 Smooth Standard', speed: '0.55s', desc: 'Mulus, formal, & elegan' },
  { value: 'slow', label: '🕊️ Slow & Relaxed', speed: '0.85s', desc: 'Santai, tenang, & damai' },
  { value: 'jump_cut', label: '✂️ Instant Cut', speed: '0.0s', desc: 'Langsung potong sudut (TV multicam)' },
]

const PIPELINE_STAGES = ['uploaded', 'transcribed', 'analyzed', 'completed']
function pipelineProgress(status: string) {
  const idx = PIPELINE_STAGES.indexOf(status)
  return idx === -1
    ? 0
    : Math.round((idx / (PIPELINE_STAGES.length - 1)) * 100)
}

export function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedHooks, setSelectedHooks] = useState<string[]>([])
  const [platform, setPlatform] = useState<TargetPlatform>('youtube_shorts')
  const [framingMode, setFramingMode] = useState<FramingMode>('auto')
  const [panStyle, setPanStyle] = useState<PanStyle>('snappy')

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [playerModalOpen, setPlayerModalOpen] = useState(false)

  // Clip Modals (Preview & Delete)
  const [previewClip, setPreviewClip] = useState<Clip | null>(null)
  const [clipToDelete, setClipToDelete] = useState<Clip | null>(null)

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

  const isVertical = PLATFORMS.find((p) => p.value === platform)?.aspect === '9:16'

  const extractMutation = useMutation({
    mutationFn: () =>
      videoService.extractClips(id!, {
        hook_ids:
          selectedHooks.length > 0
            ? selectedHooks
            : hooksData?.items.map((h) => h.id) ?? [],
        target_platform: platform,
        framing_mode: isVertical ? framingMode : undefined,
        pan_style: isVertical && framingMode === 'auto' ? panStyle : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video', id] })
      qc.invalidateQueries({ queryKey: ['clips', id] })
      toast.success('Clips extracted')
    },
    onError: (e: Error) => toast.error('Extraction failed', e.message),
  })

  const clipExportMutation = useMutation({
    mutationFn: (clipId: string) =>
      clipService.export(clipId, {
        burn_subtitles: true,
        generate_title: true,
        generate_caption: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clips', id] })
      toast.success('Clip exported', 'Video with burned subtitles ready for download.')
      setPreviewClip(null)
    },
    onError: (e: Error) => toast.error('Export failed', e.message),
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
            <div className="flex items-center flex-wrap gap-3">
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as TargetPlatform)}
              >
                <SelectTrigger className="w-56 h-9 rounded-xl text-xs bg-muted/40">
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

              {isVertical && (
                <Select
                  value={framingMode}
                  onValueChange={(v) => setFramingMode(v as FramingMode)}
                >
                  <SelectTrigger className="w-56 h-9 rounded-xl text-xs bg-muted/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAMING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="font-medium text-xs">{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isVertical && framingMode === 'auto' && (
                <Select
                  value={panStyle}
                  onValueChange={(v) => setPanStyle(v as PanStyle)}
                >
                  <SelectTrigger className="w-52 h-9 rounded-xl text-xs bg-muted/40" title="Gaya kecepatan dan transisi geser kamera">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAN_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col text-left py-0.5">
                          <span className="font-medium text-xs flex items-center justify-between gap-2">
                            <span>{opt.label}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{opt.speed}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

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
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:border-border transition-colors"
                  >
                    <button
                      onClick={() => setPreviewClip(clip)}
                      className="w-9 h-9 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/20 text-primary flex items-center justify-center shrink-0 transition-all shadow-2xs hover:scale-105"
                      title="Preview clip with safe zones & angle"
                    >
                      <Play size={14} className="ml-0.5 fill-current" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {clip.title ??
                            `${formatTimestamp(clip.start_time)} → ${formatTimestamp(clip.end_time)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-mono">
                          {formatTimestamp(clip.start_time)} → {formatTimestamp(clip.end_time)}
                        </span>
                        <span>•</span>
                        <span>{formatDuration(clip.end_time - clip.start_time)}</span>
                        <span>•</span>
                        <span className="font-mono">{platformLabel(clip.target_platform)}</span>
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

                    <StatusBadge status={clip.status} />

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Preview Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewClip(clip)}
                        className="h-8 rounded-xl text-xs flex items-center gap-1.5 bg-card/80 border-border/70"
                      >
                        <Eye size={12} /> Preview
                      </Button>

                      {/* Download button if exported */}
                      {clip.status === 'exported' && (
                        <a
                          href={clipService.getClipDownloadUrl(clip.id)}
                          download
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                          title="Download video file"
                        >
                          <Download size={12} />
                        </a>
                      )}

                      {/* Delete Clip Button */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setClipToDelete(clip)}
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete clip and local video files"
                      >
                        <Trash2 size={13} />
                      </Button>

                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link to={`/clips?videoId=${id}`} title="View in Clips Studio">
                          <ChevronRight size={14} />
                        </Link>
                      </Button>
                    </div>
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

      {/* Clip Preview Modal with Safe-Zone & Angle Previews */}
      <ClipPreviewModal
        clip={previewClip}
        open={!!previewClip}
        onOpenChange={(o) => !o && setPreviewClip(null)}
        onExport={(clipId) => clipExportMutation.mutate(clipId)}
        isExporting={clipExportMutation.isPending}
      />

      {/* Clip Delete Dialog with Local File Cleanup */}
      <ClipDeleteDialog
        clip={clipToDelete}
        open={!!clipToDelete}
        onOpenChange={(o) => !o && setClipToDelete(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['clips', id] })
          qc.invalidateQueries({ queryKey: ['video', id] })
        }}
      />
    </div>
  )
}

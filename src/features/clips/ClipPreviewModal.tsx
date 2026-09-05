import { useRef, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Upload,
  Layers,
  Sparkles,
  Sliders,
  Shield,
  FileDown,
  Clock,
  Tv,
  Smartphone,
  User,
  Check,
  Loader2,
  Zap,
  HelpCircle,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { StatusBadge } from '@/shared/components/ui/badge'
import { clipService, videoService } from '@/services/video.service'
import { formatDuration, formatTimestamp, platformLabel } from '@/shared/utils'
import { toast } from '@/shared/hooks/useToast'
import type { Clip, FramingMode, PanStyle } from '@/types'

const PAN_STYLES: {
  value: PanStyle
  label: string
  speed: string
  badge: string
  desc: string
  recommendation: string
}[] = [
  {
    value: 'snappy',
    label: '⚡ Snappy Cinematic',
    speed: '0.35s',
    badge: 'FYP & Shorts',
    desc: 'Cepat & sigap dengan rem halus pas saat kata pertama diucapkan. Sangat dinamis tanpa membuat pusing.',
    recommendation: 'Rekomendasi utama untuk TikTok, Reels, YouTube Shorts, & podcast komedi / sahut-sahutan.',
  },
  {
    value: 'smooth',
    label: '🎬 Smooth Standard',
    speed: '0.55s',
    badge: 'Formal & Elegan',
    desc: 'Transisi seimbang dan mengalun tenang. Terasa elegan dan sinematik.',
    recommendation: 'Cocok untuk wawancara formal, konten edukasi, atau talkshow bertempo sedang.',
  },
  {
    value: 'slow',
    label: '🕊️ Slow & Relaxed',
    speed: '0.85s',
    badge: 'Santai & Tenang',
    desc: 'Pergerakan perlahan dan damai, memberikan kesan tenang tanpa terburu-buru.',
    recommendation: 'Cocok untuk monolog, storytelling, ceramah, atau obrolan bernuansa santai.',
  },
  {
    value: 'jump_cut',
    label: '✂️ Instant Cut',
    speed: '0.0s (Instan)',
    badge: 'Multi-Kamera TV',
    desc: 'Langsung memotong sudut kamera seketika dalam 1 frame tanpa efek geser.',
    recommendation: 'Mirip siaran multi-kamera televisi / talkshow studio profesional.',
  },
]

interface ClipPreviewModalProps {
  clip: Clip | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport?: (clipId: string) => void
  isExporting?: boolean
}

export function ClipPreviewModal({
  clip,
  open,
  onOpenChange,
  onExport,
  isExporting,
}: ClipPreviewModalProps) {
  const qc = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showSafeZone, setShowSafeZone] = useState(true)
  const [selectedFraming, setSelectedFraming] = useState<FramingMode>(clip?.framing_mode || 'auto')
  const [selectedPanStyle, setSelectedPanStyle] = useState<PanStyle>(clip?.pan_style || 'snappy')
  const [showGuidance, setShowGuidance] = useState(false)
  const [streamNonce, setStreamNonce] = useState(Date.now())

  useEffect(() => {
    if (clip) {
      setSelectedFraming(clip.framing_mode || 'auto')
      setSelectedPanStyle(clip.pan_style || 'snappy')
    }
  }, [clip])

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [open])

  const reframeMutation = useMutation({
    mutationFn: ({ mode, style }: { mode: FramingMode; style?: PanStyle }) =>
      clipService.reframe(clip!.id, mode, style),
    onSuccess: (updatedClip) => {
      setSelectedFraming(updatedClip.framing_mode || 'auto')
      setSelectedPanStyle(updatedClip.pan_style || 'snappy')
      setStreamNonce(Date.now())
      if (videoRef.current) {
        videoRef.current.load()
      }
      qc.invalidateQueries({ queryKey: ['clips'] })
      qc.invalidateQueries({ queryKey: ['video'] })
      toast.success(
        'Framing Updated',
        `Clip re-rendered with ${updatedClip.framing_mode} layout (${updatedClip.pan_style || 'snappy'}).`
      )
    },
    onError: (e: Error) => {
      toast.error('Reframe Failed', e.message)
    },
  })

  if (!clip) return null

  const isVertical = [
    'youtube_shorts',
    'tiktok',
    'instagram_reels',
    'facebook_reels',
  ].includes(clip.target_platform)

  const streamUrl = `${clipService.getClipStreamUrl(clip.id)}?v=${streamNonce}`
  const duration = clip.end_time - clip.start_time


  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleDownloadSubtitles = (format: 'srt' | 'ass') => {
    const url = clipService.getClipSubtitleDownloadUrl(clip.id, format)
    const link = document.createElement('a')
    link.href = url
    link.download = `clip_${clip.id}.${format}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Downloading .${format.toUpperCase()}`, 'Clip subtitle file exported.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#0B0D14]/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-2xl p-0 overflow-hidden text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-card/40">
          <div className="space-y-0.5 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-sm font-bold tracking-tight text-white truncate">
                {clip.title || `Clip ${formatTimestamp(clip.start_time)}`}
              </DialogTitle>
              <StatusBadge status={clip.status} />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                {isVertical ? <Smartphone size={10} /> : <Tv size={10} />}
                {isVertical ? '9:16 Portrait' : '16:9 Landscape'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-3">
              <span className="font-mono">
                {formatTimestamp(clip.start_time)} → {formatTimestamp(clip.end_time)}
              </span>
              <span>•</span>
              <span>{formatDuration(duration)}</span>
              <span>•</span>
              <span>{platformLabel(clip.target_platform)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isVertical && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSafeZone((p) => !p)}
                className={`h-8 rounded-xl text-xs px-2.5 flex items-center gap-1.5 transition-all ${
                  showSafeZone
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-card border-border/60 text-muted-foreground'
                }`}
              >
                <Shield size={12} /> Safe Zones
              </Button>
            )}

            {clip.status === 'exported' ? (
              <a
                href={clipService.getClipDownloadUrl(clip.id)}
                download
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download size={12} /> Download Video
              </a>
            ) : (
              <Button
                size="sm"
                loading={isExporting}
                onClick={() => onExport?.(clip.id)}
                className="h-8 rounded-xl text-xs font-semibold px-3 gradient-brand text-white shadow-sm flex items-center gap-1.5"
              >
                <Upload size={12} /> Export Final
              </Button>
            )}
          </div>
        </div>

        {/* Studio Canvas & Inspector Body */}
        <div className="flex flex-col md:flex-row min-h-[460px] bg-black/40">
          {/* Main Video Viewport */}
          <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-dot-grid">
            <div
              className={`relative overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/10 ${
                isVertical ? 'aspect-[9/16] max-h-[440px]' : 'aspect-video w-full max-w-[620px]'
              }`}
            >
              <video
                ref={videoRef}
                src={streamUrl}
                playsInline
                muted={isMuted}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* TikTok / Shorts UI Safe Zone Overlay */}
              {isVertical && showSafeZone && (
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 border-2 border-dashed border-primary/40 rounded-2xl">
                  {/* Top safe margin */}
                  <div className="bg-black/40 backdrop-blur-xs px-2 py-1 rounded text-[9px] font-mono text-primary/80 self-center">
                    Top Safe Margin (Header/Search)
                  </div>

                  {/* Right side interaction icons preview */}
                  <div className="self-end space-y-3 pr-1 opacity-70">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white">❤️</div>
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white">💬</div>
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] text-white">🔗</div>
                  </div>

                  {/* Bottom safe margin for captions and sound bar */}
                  <div className="bg-black/50 backdrop-blur-xs p-1.5 rounded text-[9px] font-mono text-primary/80 text-center">
                    Bottom Safe Zone (Title & Audio Tag)
                  </div>
                </div>
              )}

              {/* Play / Pause Central Overlay Button */}
              <button
                onClick={togglePlay}
                className={`absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all ${
                  isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100 shadow-xl'
                }`}
              >
                {isPlaying ? (
                  <Pause size={18} className="fill-current" />
                ) : (
                  <Play size={18} className="fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Right Rail: Framing & Subtitle Controls */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/70 p-5 bg-card/30 backdrop-blur-xl flex flex-col justify-between space-y-5 overflow-y-auto max-h-[85vh]">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
                  <Sliders size={13} className="text-primary" /> Camera & Framing
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  AI Speaker Tracking & Layouts
                </p>
              </div>

              {/* Framing Mode Selection Grid (for vertical clips) */}
              {isVertical && (
                <div className="space-y-2.5 p-3 rounded-2xl bg-secondary/40 border border-border/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">Pilihan Framing</span>
                    {reframeMutation.isPending && (
                      <span className="text-[10px] text-primary flex items-center gap-1 animate-pulse font-mono">
                        <Loader2 size={10} className="animate-spin" /> Processing
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Auto-Pan */}
                    <button
                      type="button"
                      onClick={() => setSelectedFraming('auto')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        selectedFraming === 'auto'
                          ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                          : 'bg-card/50 border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <Sparkles size={11} className="text-amber-400 shrink-0" />
                        <span className="truncate">Auto-Pan</span>
                      </div>
                      <span className="text-[9px] opacity-70 block mt-0.5">AI Lacak Geser</span>
                    </button>

                    {/* Split Screen */}
                    <button
                      type="button"
                      onClick={() => setSelectedFraming('split')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        selectedFraming === 'split'
                          ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                          : 'bg-card/50 border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <Layers size={11} className="text-cyan-400 shrink-0" />
                        <span className="truncate">Split-Screen</span>
                      </div>
                      <span className="text-[9px] opacity-70 block mt-0.5">Stacked 2-Tier</span>
                    </button>

                    {/* Focus Left */}
                    <button
                      type="button"
                      onClick={() => setSelectedFraming('left')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        selectedFraming === 'left'
                          ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                          : 'bg-card/50 border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <User size={11} className="shrink-0" />
                        <span className="truncate">Fokus Kiri</span>
                      </div>
                      <span className="text-[9px] opacity-70 block mt-0.5">Host Kiri</span>
                    </button>

                    {/* Focus Center */}
                    <button
                      type="button"
                      onClick={() => setSelectedFraming('center')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        selectedFraming === 'center'
                          ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                          : 'bg-card/50 border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <User size={11} className="shrink-0" />
                        <span className="truncate">Fokus Tengah</span>
                      </div>
                      <span className="text-[9px] opacity-70 block mt-0.5">Center</span>
                    </button>

                    {/* Focus Right */}
                    <button
                      type="button"
                      onClick={() => setSelectedFraming('right')}
                      className={`p-2 rounded-xl border text-left transition-all col-span-2 ${
                        selectedFraming === 'right'
                          ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                          : 'bg-card/50 border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[11px]">
                        <User size={11} className="shrink-0" />
                        <span className="truncate">Fokus Kanan</span>
                      </div>
                      <span className="text-[9px] opacity-70 block mt-0.5">Guest / Host Kanan</span>
                    </button>
                  </div>

                  {/* Pan Style Selector (when Auto-Pan is active) */}
                  {selectedFraming === 'auto' && (
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                          <Zap size={11} className="text-amber-400 shrink-0" /> Gaya Geser Kamera
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowGuidance((p) => !p)}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <HelpCircle size={10} />
                          {showGuidance ? 'Tutup Panduan' : 'Lihat Panduan'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {PAN_STYLES.map((ps) => (
                          <button
                            key={ps.value}
                            type="button"
                            onClick={() => setSelectedPanStyle(ps.value)}
                            className={`p-2 rounded-xl border text-left transition-all ${
                              selectedPanStyle === ps.value
                                ? 'bg-primary/20 border-primary text-primary font-semibold shadow-xs'
                                : 'bg-card/50 border-border/60 hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="truncate">{ps.label}</span>
                            </div>
                            <span className="text-[9px] opacity-70 block mt-0.5">{ps.badge}</span>
                          </button>
                        ))}
                      </div>

                      {/* Interactive Guidance Box */}
                      {showGuidance && (
                        <div className="p-3 rounded-xl bg-card/90 border border-primary/30 space-y-2 text-[10px] mt-2 animate-fade-in shadow-md">
                          <div className="flex items-center gap-1.5 text-primary font-semibold">
                            <Info size={12} />
                            <span>Panduan Karakteristik Gaya Kamera:</span>
                          </div>
                          <div className="space-y-2">
                            {PAN_STYLES.map((ps) => (
                              <div
                                key={ps.value}
                                className={`p-2 rounded-lg border ${
                                  selectedPanStyle === ps.value
                                    ? 'bg-primary/10 border-primary/40'
                                    : 'bg-muted/30 border-border/40'
                                }`}
                              >
                                <div className="flex items-center justify-between font-semibold text-foreground text-[10.5px]">
                                  <span>{ps.label}</span>
                                  <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                                    {ps.speed}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-0.5 leading-relaxed">{ps.desc}</p>
                                <p className="text-primary/90 mt-1 font-medium leading-relaxed">
                                  👉 {ps.recommendation}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Apply Framing Button when changed */}
                  {(selectedFraming !== (clip.framing_mode || 'auto') ||
                    (selectedFraming === 'auto' && selectedPanStyle !== (clip.pan_style || 'snappy'))) && (
                    <Button
                      size="sm"
                      onClick={() =>
                        reframeMutation.mutate({
                          mode: selectedFraming,
                          style: selectedFraming === 'auto' ? selectedPanStyle : undefined,
                        })
                      }
                      disabled={reframeMutation.isPending}
                      className="w-full h-8 rounded-xl text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 shadow-sm mt-2"
                    >
                      {reframeMutation.isPending ? (
                        <>
                          <Loader2 size={12} className="animate-spin" /> Sedang Re-Render...
                        </>
                      ) : (
                        <>
                          <Check size={12} /> Terapkan Framing & Gaya Ini
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* Camera Tracking Info Card */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">
                    Status Framing
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/20 text-primary font-mono font-medium capitalize">
                    {clip.framing_mode || (isVertical ? 'Auto-Pan' : 'Native 16:9')}
                    {clip.framing_mode === 'auto' && clip.pan_style && ` • ${clip.pan_style.toUpperCase()}`}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {selectedFraming === 'auto'
                    ? 'AI melacak pergerakan pembicara aktif dan menggeser kamera secara mulus (smoothstep ease-in-out).'
                    : selectedFraming === 'split'
                    ? 'Format vertikal 2-tier stacked (atas & bawah) untuk talkshow multi-orang.'
                    : `Kamera terkunci pada sudut ${selectedFraming}.`}
                </p>
              </div>


              {/* Subtitle Downloads */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
                  <FileDown size={13} className="text-primary" /> Subtitles
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSubtitles('srt')}
                    className="h-8 rounded-xl text-xs bg-card border-border/70 hover:bg-muted"
                  >
                    .SRT Subtitle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadSubtitles('ass')}
                    className="h-8 rounded-xl text-xs bg-card border-border/70 hover:bg-muted text-violet-400"
                  >
                    .ASS Karaoke
                  </Button>
                </div>
              </div>
            </div>

            {/* Bottom Playback status */}
            <div className="p-3 rounded-xl bg-card/60 border border-border/70 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {formatTimestamp(currentTime)}
              </span>
              <button
                onClick={() => setIsMuted((m) => !m)}
                className="hover:text-foreground transition-colors"
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

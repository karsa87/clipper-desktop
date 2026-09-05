import { useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  FileText,
  Download,
  Save,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Edit2,
  FileDown,
  Layers,
  Volume2,
} from 'lucide-react'
import { videoService } from '@/services/video.service'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { formatTimestamp, formatDuration } from '@/shared/utils'
import { toast } from '@/shared/hooks/useToast'
import type { TranscriptSegment } from '@/types'

export function TranscriptPage() {
  const [params] = useSearchParams()
  const videoIdParam = params.get('videoId')
  const [search, setSearch] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdParam)
  const qc = useQueryClient()

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedSegments, setEditedSegments] = useState<TranscriptSegment[] | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Mini-player state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const { data: videos } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  const {
    data: transcript,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transcript', selectedVideoId],
    queryFn: async () => {
      const res = await videoService.getTranscript(selectedVideoId!)
      setEditedSegments(res.segments)
      setHasUnsavedChanges(false)
      setEditingIndex(null)
      return res
    },
    enabled: !!selectedVideoId,
    retry: false,
  })

  const selectedVideo = (videos?.items ?? []).find((v) => v.id === selectedVideoId)

  const currentSegments = editedSegments ?? transcript?.segments ?? []

  const filteredSegments = useMemo(() => {
    if (!search.trim()) return currentSegments.map((seg, idx) => ({ seg, originalIndex: idx }))
    const q = search.toLowerCase()
    return currentSegments
      .map((seg, idx) => ({ seg, originalIndex: idx }))
      .filter(({ seg }) => seg.text.toLowerCase().includes(q))
  }, [currentSegments, search])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVideoId || !editedSegments) return
      return await videoService.updateTranscript(
        selectedVideoId,
        editedSegments.map((s) => ({ start: s.start, end: s.end, text: s.text }))
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcript', selectedVideoId] })
      setHasUnsavedChanges(false)
      setEditingIndex(null)
      toast.success('Transcript saved', 'All subtitle segments updated successfully.')
    },
    onError: (e: Error) => {
      toast.error('Save failed', e.message)
    },
  })

  const handleTextChange = (originalIndex: number, newText: string) => {
    if (!editedSegments) return
    const updated = [...editedSegments]
    updated[originalIndex] = { ...updated[originalIndex], text: newText }
    setEditedSegments(updated)
    setHasUnsavedChanges(true)
  }

  const jumpToTime = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

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

  const handleDownload = (format: 'srt' | 'ass') => {
    if (!selectedVideoId) return
    const url = videoService.getSubtitleDownloadUrl(selectedVideoId, format)
    const link = document.createElement('a')
    link.href = url
    link.download = `subtitles_${selectedVideoId}.${format}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Downloading .${format.toUpperCase()}`, 'Your subtitle file is ready.')
  }

  const highlight = (text: string) => {
    if (!search.trim()) return <>{text}</>
    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-primary/30 text-primary font-medium rounded-sm px-0.5">
              {p}
            </mark>
          ) : (
            p
          )
        )}
      </>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-background animate-fade-up">
      {/* Left Sidebar: Video Selection */}
      {!videoIdParam && (
        <div className="w-64 border-r border-border/80 bg-card/30 backdrop-blur-xl flex flex-col shrink-0">
          <div className="px-4 py-3.5 border-b border-border/80">
            <p className="text-xs font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
              <Layers size={13} className="text-primary" /> Source Videos
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select a video to edit its subtitles
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(videos?.items ?? []).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVideoId(v.id)
                  setHasUnsavedChanges(false)
                }}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                  selectedVideoId === v.id
                    ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-secondary/80 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText size={12} />
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
      )}

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedVideoId ? (
          <EmptyState
            icon={<FileText size={28} className="text-primary" />}
            title="Select a Video"
            description="Choose a video from the sidebar to inspect, edit, and export its subtitles."
            className="flex-1 flex flex-col justify-center"
          />
        ) : isLoading ? (
          <div className="p-8 space-y-4 max-w-4xl mx-auto w-full">
            <SkeletonTable rows={8} />
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={28} className="text-destructive" />}
            title="No Transcript Available"
            description="This video has not been transcribed yet. Head over to the Video Details page to run AI Whisper transcription."
            className="flex-1 flex flex-col justify-center"
          />
        ) : transcript ? (
          <>
            {/* Top Toolbar */}
            <div className="px-6 py-4 border-b border-border/80 bg-card/40 backdrop-blur-md shrink-0 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" /> Subtitle Studio
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase font-semibold">
                    {transcript.language?.toUpperCase() || 'AUTO'}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                      Unsaved Changes
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {filteredSegments.length} of {currentSegments.length} subtitle segments · Click any
                  text to edit
                </p>
              </div>

              {/* Action Buttons: Save & Downloads */}
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    loading={saveMutation.isPending}
                    className="h-8 rounded-xl text-xs font-semibold px-3 gradient-brand text-white shadow-sm flex items-center gap-1.5"
                  >
                    <Save size={13} /> Save Changes
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('srt')}
                  className="h-8 rounded-xl text-xs font-medium px-3 bg-card border-border/80 hover:bg-muted flex items-center gap-1.5 shadow-xs"
                >
                  <FileDown size={13} className="text-primary" /> Download .SRT
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('ass')}
                  className="h-8 rounded-xl text-xs font-medium px-3 bg-card border-border/80 hover:bg-muted flex items-center gap-1.5 shadow-xs"
                >
                  <Download size={13} className="text-violet-400" /> Download .ASS (Karaoke)
                </Button>
              </div>
            </div>

            {/* Studio Workspace: Left Editor + Right Audio/Video Sync Player */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Segment List & Search */}
              <div className="flex-1 flex flex-col min-w-0 border-r border-border/80 overflow-hidden">
                <div className="p-4 border-b border-border/60 bg-muted/20">
                  <Input
                    leftIcon={<Search size={14} className="text-muted-foreground" />}
                    placeholder="Search words, dialogue, or keywords in transcript…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 rounded-xl text-xs bg-card/80"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredSegments.map(({ seg, originalIndex }) => {
                    const isEditing = editingIndex === originalIndex
                    const isCurrentlyPlaying =
                      currentTime >= seg.start && currentTime <= seg.end

                    return (
                      <div
                        key={originalIndex}
                        className={`group p-3.5 rounded-2xl border transition-all ${
                          isCurrentlyPlaying
                            ? 'border-primary/60 bg-primary/5 shadow-sm'
                            : 'border-border/60 bg-card/50 hover:border-border/90 hover:bg-card/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <button
                            onClick={() => jumpToTime(seg.start)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-secondary/80 text-secondary-foreground hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                          >
                            <Play size={10} className="fill-current" />
                            {formatTimestamp(seg.start)} → {formatTimestamp(seg.end)}
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {(seg.end - seg.start).toFixed(1)}s
                            </span>
                            <button
                              onClick={() =>
                                setEditingIndex(isEditing ? null : originalIndex)
                              }
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Toggle Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              value={seg.text}
                              onChange={(e) =>
                                handleTextChange(originalIndex, e.target.value)
                              }
                              className="w-full text-xs font-medium bg-muted/60 border border-primary/40 rounded-xl p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingIndex(null)}
                                className="h-6 text-[10px] px-2"
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            onClick={() => setEditingIndex(originalIndex)}
                            className="text-xs text-foreground/90 leading-relaxed cursor-text hover:text-foreground transition-colors"
                          >
                            {highlight(seg.text)}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {filteredSegments.length === 0 && search && (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      No dialogue found matching "{search}"
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Mini Sync Player */}
              <div className="w-80 border-l border-border/80 bg-card/20 backdrop-blur-xl flex flex-col shrink-0 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-tight text-foreground uppercase flex items-center gap-1.5">
                    <Volume2 size={13} className="text-primary" /> Audio / Video Sync
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatTimestamp(currentTime)}
                  </span>
                </div>

                {/* Video / Audio Player */}
                {selectedVideo && (
                  <div className="relative rounded-2xl overflow-hidden bg-black/90 aspect-video border border-border/80 shadow-md">
                    <video
                      ref={videoRef}
                      src={videoService.getStreamUrl(selectedVideo.id)}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-80 hover:opacity-100 shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause size={16} className="fill-current" />
                      ) : (
                        <Play size={16} className="fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Live Caption Display */}
                <div className="p-4 rounded-2xl bg-card/80 border border-border/80 space-y-2 shadow-xs">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Current Subtitle Cue
                  </p>
                  <p className="text-xs text-foreground font-medium italic min-h-12 leading-relaxed">
                    {currentSegments.find(
                      (s) => currentTime >= s.start && currentTime <= s.end
                    )?.text || (
                      <span className="text-muted-foreground/60 not-italic">
                        (Silence / No active speech)
                      </span>
                    )}
                  </p>
                </div>

                {/* Quick Info */}
                <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-[11px] text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <CheckCircle size={12} className="text-emerald-500" /> Professional Subtitle Export
                  </p>
                  <p className="leading-normal">
                    Download <strong className="text-foreground">.SRT</strong> for Premiere Pro, DaVinci, or CapCut.
                  </p>
                  <p className="leading-normal">
                    Download <strong className="text-foreground">.ASS</strong> for animated karaoke highlights and social-ready styling.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

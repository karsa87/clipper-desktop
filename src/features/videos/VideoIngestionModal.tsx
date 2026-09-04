import { useState, useRef } from 'react'
import {
  Upload,
  Link2,
  Sparkles,
  Youtube,
  Film,
  User,
  Users,
  AtSign,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { formatDuration } from '@/shared/utils'
import type { VideoPreviewResponse } from '@/types'

interface VideoIngestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function VideoIngestionModal({
  open,
  onOpenChange,
  onSuccess,
}: VideoIngestionModalProps) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // URL state
  const [url, setUrl] = useState('')
  const [fetchingInfo, setFetchingInfo] = useState(false)
  const [previewInfo, setPreviewInfo] = useState<VideoPreviewResponse | null>(null)

  // Shared metadata form
  const [title, setTitle] = useState('')
  const [creatorAccount, setCreatorAccount] = useState('')
  const [hostNames, setHostNames] = useState('')
  const [guestStars, setGuestStars] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setSelectedFile(null)
    setUrl('')
    setPreviewInfo(null)
    setTitle('')
    setCreatorAccount('')
    setHostNames('')
    setGuestStars('')
    setSubmitting(false)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    if (!title) {
      // Pre-fill title without file extension
      setTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleFetchUrlInfo = async () => {
    if (!url.trim()) return
    setFetchingInfo(true)
    try {
      const data = await videoService.previewUrl(url.trim())
      setPreviewInfo(data)
      if (data.title && !title) setTitle(data.title)
      if (data.channel && !creatorAccount) setCreatorAccount(data.channel)
      toast.success('Video preview loaded', data.title ?? 'Fetched successfully')
    } catch (err: any) {
      toast.error('Preview error', err.response?.data?.message || err.message)
    } finally {
      setFetchingInfo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const parsedHosts = hostNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const parsedGuests = guestStars
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      if (tab === 'upload') {
        if (!selectedFile) {
          toast.error('File required', 'Please select a video file to upload.')
          setSubmitting(false)
          return
        }
        await videoService.upload(selectedFile, {
          title: title.trim() || selectedFile.name,
          creator_account: creatorAccount.trim() || undefined,
          host_names: parsedHosts,
          guest_stars: parsedGuests,
        })
        toast.success('Video uploaded', 'Video is ready in your library.')
      } else {
        if (!url.trim()) {
          toast.error('URL required', 'Please paste a valid video URL.')
          setSubmitting(false)
          return
        }
        await videoService.importUrl({
          url: url.trim(),
          title: title.trim() || previewInfo?.title || 'Imported Video',
          creator_account: creatorAccount.trim() || previewInfo?.channel || undefined,
          host_names: parsedHosts,
          guest_stars: parsedGuests,
        })
        toast.success('Import queued', 'Video is downloading in background.')
      }

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (err: any) {
      toast.error('Ingestion failed', err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-0 overflow-hidden">
        {/* Header with gradient badge */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles size={12} /> Add New Video
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Ingest Video Content
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Upload a local media file or import directly from YouTube, TikTok, Facebook, or Bilibili.
          </DialogDescription>

          {/* Segmented Control Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-xl mt-4 border border-border/50">
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === 'upload'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload size={14} className={tab === 'upload' ? 'text-primary' : ''} />
              Option 1: Local File
            </button>
            <button
              type="button"
              onClick={() => setTab('url')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === 'url'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 size={14} className={tab === 'url' ? 'text-primary' : ''} />
              Option 2: Import from Link
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {tab === 'upload' ? (
            /* Option 1: Drag & Drop Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFileSelect(f)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-primary bg-primary/10 scale-[0.99]'
                  : selectedFile
                  ? 'border-success/50 bg-success/5'
                  : 'border-border/80 hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/avi"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />
              <div className="flex flex-col items-center gap-2">
                {selectedFile ? (
                  <div className="w-12 h-12 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center text-success">
                    <CheckCircle2 size={24} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Upload size={22} />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedFile ? selectedFile.name : 'Choose a file or drag it here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB selected • Click to replace`
                      : 'MP4, MOV, MKV, WebM up to 2GB'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Option 2: OTT / Social Link Import */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="video-url" className="text-xs font-semibold flex items-center gap-1.5">
                  <Link2 size={13} className="text-primary" /> Video Link (YouTube, TikTok, Facebook, Bilibili)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="video-url"
                    placeholder="https://www.youtube.com/watch?v=... or TikTok/Facebook link"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-muted/40 border-border/80 focus:border-primary"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleFetchUrlInfo}
                    loading={fetchingInfo}
                    disabled={!url.trim()}
                    className="shrink-0 h-10 px-4 text-xs font-semibold rounded-xl"
                  >
                    Fetch Info
                  </Button>
                </div>
              </div>

              {/* Supported Platforms Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                <span className="font-medium mr-1">Supported:</span>
                {['YouTube', 'TikTok', 'Facebook', 'Bilibili', 'Instagram', 'Twitter / X'].map((plat) => (
                  <span
                    key={plat}
                    className="px-2 py-0.5 rounded-md bg-secondary/50 border border-border/60 text-[10px] font-mono text-muted-foreground"
                  >
                    {plat}
                  </span>
                ))}
              </div>

              {/* Preview Card */}
              {previewInfo && (
                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-primary/20 bg-primary/5 animate-fade-in">
                  {previewInfo.thumbnail ? (
                    <img
                      src={previewInfo.thumbnail}
                      alt="Thumbnail"
                      className="w-20 h-14 object-cover rounded-lg border border-border/80 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <Film size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{previewInfo.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {previewInfo.channel && <span>{previewInfo.channel} • </span>}
                      {previewInfo.duration_seconds && (
                        <span>{formatDuration(previewInfo.duration_seconds)}</span>
                      )}
                    </p>
                    {previewInfo.platform && (
                      <span className="inline-block mt-1 text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary font-medium">
                        {previewInfo.platform}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Video Details & Context (For Gemini AI) */}
          <div className="pt-2 border-t border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" /> Context & Metadata Enrichment
              </span>
              <span className="text-[10px] text-muted-foreground">Used for AI clips & hook detection</span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title" className="text-xs font-medium">
                Video Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                required
                placeholder="e.g. AI Revolution & Autonomous Agents in 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs rounded-xl bg-muted/40"
              />
            </div>

            {/* Creator Account Handle */}
            <div className="space-y-1">
              <Label htmlFor="creator" className="text-xs font-medium flex items-center gap-1">
                <AtSign size={12} className="text-muted-foreground" /> Creator Account / Channel Name
              </Label>
              <Input
                id="creator"
                placeholder="e.g. @lexfridman or Lex Fridman Podcast"
                value={creatorAccount}
                onChange={(e) => setCreatorAccount(e.target.value)}
                className="h-9 text-xs rounded-xl bg-muted/40"
              />
            </div>

            {/* Host(s) & Guest Star(s) Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="hosts" className="text-xs font-medium flex items-center gap-1">
                  <User size={12} className="text-muted-foreground" /> Host Name(s)
                </Label>
                <Input
                  id="hosts"
                  placeholder="e.g. Lex Fridman (comma-separated)"
                  value={hostNames}
                  onChange={(e) => setHostNames(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-muted/40"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="guests" className="text-xs font-medium flex items-center gap-1">
                  <Users size={12} className="text-muted-foreground" /> Guest Star(s)
                </Label>
                <Input
                  id="guests"
                  placeholder="e.g. Demis Hassabis, Sam Altman"
                  value={guestStars}
                  onChange={(e) => setGuestStars(e.target.value)}
                  className="h-9 text-xs rounded-xl bg-muted/40"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="h-9 rounded-xl text-xs font-semibold px-5 gradient-brand text-white shadow-md hover:opacity-95"
            >
              {tab === 'upload' ? 'Upload & Start Processing' : 'Queue Video Download'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

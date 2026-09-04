import { useRef, useEffect } from 'react'
import { Play, Volume2, Maximize, Clock, FileVideo } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { videoService } from '@/services/video.service'
import { formatDuration } from '@/shared/utils'
import type { Video } from '@/types'

interface VideoPlayerModalProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoPlayerModal({
  video,
  open,
  onOpenChange,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause()
    }
  }, [open])

  if (!video) return null

  const streamUrl = videoService.getStreamUrl(video.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-black/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-2xl p-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-card/40">
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Play size={14} className="ml-0.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-white truncate">
                {video.title || video.filename}
              </DialogTitle>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {video.duration_seconds && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock size={11} /> {formatDuration(video.duration_seconds)}
                  </span>
                )}
                {video.width && video.height && (
                  <span>
                    • {video.width}×{video.height}
                  </span>
                )}
                <span className="capitalize">• {video.source_type}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Screen */}
        <div className="relative bg-black flex items-center justify-center aspect-video w-full max-h-[70vh]">
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full h-full object-contain focus:outline-none"
          >
            Your browser does not support HTML5 video streaming.
          </video>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-card/60 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {video.creator_account && (
              <span className="font-mono text-foreground font-medium">
                @{video.creator_account.replace(/^@/, '')}
              </span>
            )}
            {video.host_names && video.host_names.length > 0 && (
              <span>Host: {video.host_names.join(', ')}</span>
            )}
            {video.guest_stars && video.guest_stars.length > 0 && (
              <span>Guest: {video.guest_stars.join(', ')}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-lg text-xs hover:bg-white/10 text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

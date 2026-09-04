import { useState } from 'react'
import { AlertTriangle, Trash2, HardDrive } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import type { Video } from '@/types'

interface VideoDeleteDialogProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function VideoDeleteDialog({
  video,
  open,
  onOpenChange,
  onSuccess,
}: VideoDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)

  if (!video) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const result = await videoService.delete(video.id)
      const deletedCount = result?.deleted_files_count ?? 0
      toast.success(
        'Video and files deleted',
        `Removed record and ${deletedCount} associated files on disk.`
      )
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Deletion failed', err.response?.data?.message || err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border border-destructive/30 shadow-2xl rounded-2xl p-0 overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center text-destructive mb-4">
            <Trash2 size={24} />
          </div>

          <DialogTitle className="text-lg font-bold text-foreground">
            Permanently Delete Video?
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-foreground">"{video.title || video.filename}"</span>?
          </DialogDescription>

          {/* Hard Deletion Warning Callout */}
          <div className="mt-4 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 flex items-start gap-3">
            <HardDrive size={16} className="text-destructive shrink-0 mt-0.5" />
            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-destructive">Physical Disk Cleanup</p>
              <p>
                This action will <strong className="text-foreground">permanently remove the original video file</strong> from your local storage and wipe all associated clips, transcripts, subtitles, and cache.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deleting}
              className="h-9 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleting}
              onClick={handleDelete}
              className="h-9 rounded-xl text-xs font-semibold px-4 shadow-sm"
            >
              Delete Video & Files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

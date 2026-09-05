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
import { clipService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { formatTimestamp } from '@/shared/utils'
import type { Clip } from '@/types'

interface ClipDeleteDialogProps {
  clip: Clip | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ClipDeleteDialog({
  clip,
  open,
  onOpenChange,
  onSuccess,
}: ClipDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)

  if (!clip) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const result = await clipService.delete(clip.id)
      const deletedCount = result?.deleted_files_count ?? 0
      toast.success(
        'Clip and local video files deleted',
        `Removed clip record and ${deletedCount} local files on disk.`
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
      <DialogContent className="max-w-md bg-[#0B0D14]/95 backdrop-blur-xl border border-destructive/30 shadow-2xl rounded-2xl p-0 overflow-hidden text-foreground">
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center text-destructive">
            <Trash2 size={24} />
          </div>

          <div>
            <DialogTitle className="text-lg font-bold text-white">
              Delete Video Clip & Local Files?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-medium">
                {clip.title || `Clip ${formatTimestamp(clip.start_time)}`}
              </strong>
              ?
            </DialogDescription>
          </div>

          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Permanent Local Storage Deletion</p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                This will completely remove the extracted video file, draft clips, and subtitle files (.srt/.ass) from your local hard drive.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/[0.08] bg-card/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="h-9 rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            size="sm"
            loading={deleting}
            onClick={handleDelete}
            className="h-9 rounded-xl text-xs font-semibold px-4 bg-destructive hover:bg-destructive/90 text-white shadow-sm flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            Permanently Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

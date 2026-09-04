import { useState, useEffect } from 'react'
import { Edit3, AtSign, User, Users } from 'lucide-react'
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
import type { Video } from '@/types'

interface VideoEditModalProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function VideoEditModal({
  video,
  open,
  onOpenChange,
  onSuccess,
}: VideoEditModalProps) {
  const [title, setTitle] = useState('')
  const [creatorAccount, setCreatorAccount] = useState('')
  const [hostNames, setHostNames] = useState('')
  const [guestStars, setGuestStars] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (video) {
      setTitle(video.title || video.filename || '')
      setCreatorAccount(video.creator_account || '')
      setHostNames(Array.isArray(video.host_names) ? video.host_names.join(', ') : '')
      setGuestStars(Array.isArray(video.guest_stars) ? video.guest_stars.join(', ') : '')
    }
  }, [video])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!video) return

    setSaving(true)
    const parsedHosts = hostNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const parsedGuests = guestStars
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      await videoService.updateDetails(video.id, {
        title: title.trim(),
        creator_account: creatorAccount.trim() || undefined,
        host_names: parsedHosts,
        guest_stars: parsedGuests,
      })
      toast.success('Video updated', 'Video details saved successfully.')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Update failed', err.response?.data?.message || err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!video) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <Edit3 size={12} /> Edit Details
            </span>
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
            Update Video Context
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Modify title and participant tags to update downstream AI clip generation.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-title" className="text-xs font-medium">
              Video Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-creator" className="text-xs font-medium flex items-center gap-1">
              <AtSign size={12} className="text-muted-foreground" /> Creator Handle / Channel
            </Label>
            <Input
              id="edit-creator"
              placeholder="e.g. @lexfridman"
              value={creatorAccount}
              onChange={(e) => setCreatorAccount(e.target.value)}
              className="h-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-hosts" className="text-xs font-medium flex items-center gap-1">
                <User size={12} className="text-muted-foreground" /> Host(s)
              </Label>
              <Input
                id="edit-hosts"
                placeholder="Comma separated"
                value={hostNames}
                onChange={(e) => setHostNames(e.target.value)}
                className="h-9 text-xs rounded-xl bg-muted/40"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-guests" className="text-xs font-medium flex items-center gap-1">
                <Users size={12} className="text-muted-foreground" /> Guest Star(s)
              </Label>
              <Input
                id="edit-guests"
                placeholder="Comma separated"
                value={guestStars}
                onChange={(e) => setGuestStars(e.target.value)}
                className="h-9 text-xs rounded-xl bg-muted/40"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-9 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="h-9 rounded-xl text-xs font-semibold px-5 gradient-brand text-white shadow-md hover:opacity-95"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

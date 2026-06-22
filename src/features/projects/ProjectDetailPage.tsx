import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Video, Plus, Trash2, ExternalLink, FolderOpen } from 'lucide-react'
import { useProjectStore } from '@/store/projects.store'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { formatDuration, formatRelativeTime } from '@/shared/utils'

function AddVideoDialog({ open, onClose, projectId, existingIds }: {
  open: boolean; onClose: () => void; projectId: string; existingIds: string[]
}) {
  const { addVideoToProject } = useProjectStore()
  const { data, isLoading } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
    enabled: open,
  })

  const available = (data?.items ?? []).filter(v => !existingIds.includes(v.id))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Video to Project</DialogTitle></DialogHeader>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {isLoading ? <SkeletonTable rows={4} /> : available.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">No videos available to add.</p>
          ) : available.map((v) => (
            <button key={v.id}
              onClick={() => { addVideoToProject(projectId, v.id); toast.success('Video added to project'); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Video size={13} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{v.filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {v.duration_seconds ? formatDuration(v.duration_seconds) : '—'} · {formatRelativeTime(v.created_at)}
                </p>
              </div>
              <StatusBadge status={v.status} />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getProject, deleteProject, removeVideoFromProject } = useProjectStore()
  const [addOpen, setAddOpen] = useState(false)

  const project = getProject(id!)

  const { data: allVideos, isLoading } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  if (!project) {
    return (
      <div className="p-6">
        <EmptyState icon={<FolderOpen size={22} />} title="Project not found"
          action={<Button size="sm" variant="outline" asChild><Link to="/projects">Back to Projects</Link></Button>} />
      </div>
    )
  }

  const projectVideos = (allVideos?.items ?? []).filter(v => project.videoIds.includes(v.id))

  const handleDelete = () => {
    deleteProject(project.id)
    toast.success('Project deleted')
    navigate('/projects')
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto animate-fade-up">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={13} /> Back to Projects
      </Link>

      <Card>
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: project.color + '1a' }}>
            <FolderOpen size={20} style={{ color: project.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold">{project.name}</h1>
            {project.description && <p className="text-xs text-muted-foreground mt-1">{project.description}</p>}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {project.videoIds.length} video{project.videoIds.length !== 1 ? 's' : ''} · Updated {formatRelativeTime(project.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus size={13}/> Add Video</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 size={13}/> Delete</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold">Videos</p>
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}><Plus size={12}/> Add</Button>
        </div>

        {isLoading ? <SkeletonTable rows={3} /> : projectVideos.length === 0 ? (
          <EmptyState icon={<Video size={20} />} title="No videos in this project" description="Add videos to organize your clipping workflow."
            action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus size={12}/> Add Video</Button>} className="py-10" />
        ) : (
          <div className="divide-y divide-border">
            {projectVideos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Video size={13} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{v.filename}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {v.duration_seconds ? formatDuration(v.duration_seconds) : '—'} · {formatRelativeTime(v.created_at)}
                  </p>
                </div>
                <StatusBadge status={v.status} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" asChild><Link to={`/videos/${v.id}`}><ExternalLink size={13}/></Link></Button>
                  <Button variant="ghost" size="icon-sm" className="hover:text-destructive"
                    onClick={() => { removeVideoFromProject(project.id, v.id); toast.success('Removed from project') }}>
                    <Trash2 size={13}/>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AddVideoDialog open={addOpen} onClose={() => setAddOpen(false)} projectId={project.id} existingIds={project.videoIds} />
    </div>
  )
}

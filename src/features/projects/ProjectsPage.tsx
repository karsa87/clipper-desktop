import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, Edit2, Video, MoreHorizontal, Search } from 'lucide-react'
import { useProjectStore } from '@/store/projects.store'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/ui/empty-state'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { formatRelativeTime } from '@/shared/utils'
import type { Project } from '@/types'

function ProjectFormDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  const { createProject, updateProject } = useProjectStore()
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')

  const handleSubmit = () => {
    if (!name.trim()) return
    if (project) {
      updateProject(project.id, { name: name.trim(), description: description.trim() })
      toast.success('Project updated')
    } else {
      createProject(name.trim(), description.trim())
      toast.success('Project created')
    }
    setName(''); setDescription('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Project Name</label>
            <Input placeholder="My Video Project" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <textarea className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              rows={3} placeholder="What is this project about?" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {project ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const { deleteProject } = useProjectStore()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Card className="p-4 flex flex-col gap-3 hover:border-border/80 transition-colors group">
        <div className="flex items-start justify-between">
          <Link to={`/projects/${project.id}`} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: project.color + '1a' }}>
              <FolderOpen size={15} style={{ color: project.color }} />
            </div>
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Edit2 size={12} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 size={12} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.description && <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>}

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Video size={11} /> {project.videoIds.length} video{project.videoIds.length !== 1 ? 's' : ''}
          </div>
          <span className="text-[11px] text-muted-foreground">{formatRelativeTime(project.updatedAt)}</span>
        </div>
      </Card>

      <ProjectFormDialog open={editOpen} onClose={() => setEditOpen(false)} project={project} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This removes the project. Videos themselves are not deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteProject(project.id); toast.success('Project deleted') }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { projects } = useProjectStore()

  const filtered = projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Projects</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> New Project
        </Button>
      </div>

      {projects.length > 0 && (
        <Input leftIcon={<Search size={13} />} placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} />}
          title="No projects yet"
          description="Create a project to organize your videos and clips."
          action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={13}/> Create Project</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search size={22} />} title="No matching projects" description="Try a different search term." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

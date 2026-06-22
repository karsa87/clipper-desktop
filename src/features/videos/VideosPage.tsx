import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Video, Trash2, ChevronRight, Clock, Search, Filter } from 'lucide-react'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { DataTable } from '@/shared/components/ui/data-table'
import { Pagination } from '@/shared/components/ui/pagination'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { formatDuration, formatRelativeTime } from '@/shared/utils'
import type { Video as VideoType, VideoStatus } from '@/types'

const PAGE_SIZE = 10

function UploadZone({ onUpload, uploading }: { onUpload: (f: File) => void; uploading: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) onUpload(f) }}
      onClick={() => ref.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        drag ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/30'
      }`}
    >
      <input ref={ref} type="file" accept="video/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if(f) onUpload(f); e.target.value='' }} />
      <div className="flex flex-col items-center gap-2">
        {uploading
          ? <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><Upload size={18} className="text-muted-foreground" /></div>
        }
        <div>
          <p className="text-sm font-medium">{uploading ? 'Uploading…' : 'Drop video here or click to browse'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">MP4, MOV, MKV, AVI, WebM supported</p>
        </div>
      </div>
    </div>
  )
}

export function VideosPage() {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(200),
    refetchInterval: 5000,
  })

  const deleteMutation = useMutation({
    mutationFn: videoService.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['videos'] }); toast.success('Video deleted') },
    onError: (e: Error) => toast.error('Delete failed', e.message),
  })

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      await videoService.upload(file)
      qc.invalidateQueries({ queryKey: ['videos'] })
      toast.success('Video uploaded', file.name)
    } catch(e: any) {
      toast.error('Upload failed', e.message)
    } finally { setUploading(false) }
  }

  const allVideos = data?.items ?? []
  const filtered = allVideos
    .filter(v => statusFilter === 'all' || v.status === statusFilter)
    .filter(v => !search || v.filename.toLowerCase().includes(search.toLowerCase()))

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const columns = [
    {
      key: 'name', header: 'File', render: (v: VideoType) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Video size={13} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate max-w-[280px]">{v.filename}</p>
            {v.width && v.height && (
              <p className="text-[11px] text-muted-foreground">{v.width}×{v.height}</p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'duration', header: 'Duration', width: 'w-24',
      render: (v: VideoType) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock size={11} />
          {v.duration_seconds ? formatDuration(v.duration_seconds) : '—'}
        </span>
      )
    },
    {
      key: 'status', header: 'Status', width: 'w-32',
      render: (v: VideoType) => <StatusBadge status={v.status} />
    },
    {
      key: 'created', header: 'Uploaded', width: 'w-28',
      render: (v: VideoType) => <span className="text-[11px] text-muted-foreground">{formatRelativeTime(v.created_at)}</span>
    },
    {
      key: 'actions', header: '', width: 'w-20',
      render: (v: VideoType) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm"
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(v.id) }}
            className="hover:text-destructive opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </Button>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/videos/${v.id}`} onClick={(e) => e.stopPropagation()}>
              <ChevronRight size={13} />
            </Link>
          </Button>
        </div>
      )
    },
  ]

  return (
    <div className="p-6 space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Videos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{allVideos.length} total</p>
        </div>
      </div>

      <UploadZone onUpload={handleUpload} uploading={uploading} />

      <Card>
        {/* Filters */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="flex-1">
            <Input
              leftIcon={<Search size={13} />}
              placeholder="Search videos…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-36 h-9">
              <Filter size={12} className="mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="transcribed">Transcribed</SelectItem>
              <SelectItem value="analyzed">Analyzed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginated}
              keyExtractor={(v) => v.id}
              emptyState={
                <EmptyState
                  icon={<Video size={22} />}
                  title={search || statusFilter !== 'all' ? 'No videos match your filters' : 'No videos yet'}
                  description={search || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'Upload a video to get started.'}
                  className="py-12"
                />
              }
            />
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}

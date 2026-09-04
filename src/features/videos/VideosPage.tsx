import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Video as VideoIcon,
  Trash2,
  ChevronRight,
  Clock,
  Search,
  Filter,
  Globe,
  HardDrive,
  Edit3,
  User,
  Users,
  AtSign,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { videoService } from '@/services/video.service'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { DataTable } from '@/shared/components/ui/data-table'
import { Pagination } from '@/shared/components/ui/pagination'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { formatDuration, formatRelativeTime } from '@/shared/utils'
import type { Video as VideoType } from '@/types'
import { VideoIngestionModal } from './VideoIngestionModal'
import { VideoEditModal } from './VideoEditModal'
import { VideoDeleteDialog } from './VideoDeleteDialog'
import { VideoPlayerModal } from './VideoPlayerModal'
import { Play } from 'lucide-react'

const PAGE_SIZE = 10

export function VideosPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Modals state
  const [ingestModalOpen, setIngestModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null)
  const [deletingVideo, setDeletingVideo] = useState<VideoType | null>(null)
  const [playingVideo, setPlayingVideo] = useState<VideoType | null>(null)

  // Poll videos every 3s if any are downloading or processing
  const { data, isLoading } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(200),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      const hasPending = items.some((v) =>
        ['queued', 'downloading', 'transcribing', 'analyzing', 'clipping'].includes(v.status)
      )
      return hasPending ? 3000 : 8000
    },
  })

  const allVideos = data?.items ?? []
  const filtered = allVideos
    .filter((v) => statusFilter === 'all' || v.status === statusFilter)
    .filter((v) => sourceFilter === 'all' || v.source_type === sourceFilter)
    .filter((v) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const titleMatch = v.title?.toLowerCase().includes(q)
      const fileMatch = v.filename.toLowerCase().includes(q)
      const creatorMatch = v.creator_account?.toLowerCase().includes(q)
      const hostMatch = v.host_names?.some((h) => h.toLowerCase().includes(q))
      const guestMatch = v.guest_stars?.some((g) => g.toLowerCase().includes(q))
      return titleMatch || fileMatch || creatorMatch || hostMatch || guestMatch
    })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    {
      key: 'name',
      header: 'Video & Context',
      render: (v: VideoType) => (
        <div className="flex items-start gap-3 py-1">
          <div className="w-9 h-9 rounded-xl bg-secondary/80 border border-border/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            {v.source_type === 'url' ? (
              <Globe size={15} className="text-primary" />
            ) : (
              <HardDrive size={15} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/videos/${v.id}`}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate max-w-sm"
              >
                {v.title || v.filename}
              </Link>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase border border-border/60">
                {v.source_type}
              </span>
            </div>

            {/* Context chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {v.creator_account && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/60 text-secondary-foreground font-mono">
                  <AtSign size={10} /> {v.creator_account}
                </span>
              )}
              {v.host_names && v.host_names.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  <User size={10} /> {v.host_names.join(', ')}
                </span>
              )}
              {v.guest_stars && v.guest_stars.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                  <Users size={10} /> {v.guest_stars.join(', ')}
                </span>
              )}
            </div>

            {/* In-progress download indicator */}
            {v.status === 'downloading' && (
              <div className="w-48 space-y-1 pt-1">
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Downloading...</span>
                  <span>{v.download_progress ?? 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-brand transition-all duration-300"
                    style={{ width: `${v.download_progress ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      width: 'w-24',
      render: (v: VideoType) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
          <Clock size={12} className="text-muted-foreground/70" />
          {v.duration_seconds ? formatDuration(v.duration_seconds) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-32',
      render: (v: VideoType) => <StatusBadge status={v.status} />,
    },
    {
      key: 'created',
      header: 'Ingested',
      width: 'w-28',
      render: (v: VideoType) => (
        <span className="text-[11px] text-muted-foreground">
          {formatRelativeTime(v.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-36',
      render: (v: VideoType) => (
        <div className="flex items-center gap-1 justify-end">
          {v.status !== 'downloading' && v.status !== 'queued' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation()
                setPlayingVideo(v)
              }}
              title="Play Video"
              className="hover:text-primary hover:bg-primary/10 transition-colors text-primary"
            >
              <Play size={13} className="fill-current" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              setEditingVideo(v)
            }}
            title="Edit Video Details"
            className="hover:text-primary transition-colors text-muted-foreground"
          >
            <Edit3 size={13} />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingVideo(v)
            }}
            title="Delete Video & Files"
            className="hover:text-destructive hover:bg-destructive/10 transition-colors text-muted-foreground"
          >
            <Trash2 size={13} />
          </Button>

          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={`/videos/${v.id}`} onClick={(e) => e.stopPropagation()}>
              <ChevronRight size={14} />
            </Link>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fade-up">
      {/* Top Banner / Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Sparkles size={11} /> Library Management
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Video Source Library
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your long-form videos, enrich metadata context, or clip highlights with Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIngestModalOpen(true)}
            className="h-10 px-5 rounded-xl font-semibold text-xs gradient-brand text-white shadow-md hover:opacity-95 flex items-center gap-2"
          >
            <Plus size={15} /> Add Video
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card shadow-xl rounded-2xl border border-border/80 overflow-hidden">
        {/* Search & Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/60 bg-muted/20">
          <div className="flex-1 min-w-[240px]">
            <Input
              leftIcon={<Search size={14} className="text-muted-foreground" />}
              placeholder="Search by title, creator, host, or guest..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="h-9 text-xs rounded-xl bg-background/60 border-border/70"
            />
          </div>

          <Select
            value={sourceFilter}
            onValueChange={(v) => {
              setSourceFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-background/60 border-border/70">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="local">Local Files</SelectItem>
              <SelectItem value="url">Web / OTT Links</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-background/60 border-border/70">
              <Filter size={12} className="mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="downloading">Downloading</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="transcribing">Transcribing</SelectItem>
              <SelectItem value="transcribed">Transcribed</SelectItem>
              <SelectItem value="analyzed">Analyzed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Table */}
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
                  icon={<VideoIcon size={26} className="text-primary" />}
                  title={
                    search || statusFilter !== 'all' || sourceFilter !== 'all'
                      ? 'No matching videos'
                      : 'No videos ingested yet'
                  }
                  description={
                    search || statusFilter !== 'all' || sourceFilter !== 'all'
                      ? 'Try clearing your filters or searching with different keywords.'
                      : 'Upload a local video or import using a link from YouTube, TikTok, Facebook, or Bilibili.'
                  }
                  className="py-16"
                  action={
                    !search && statusFilter === 'all' && sourceFilter === 'all' ? (
                      <Button
                        onClick={() => setIngestModalOpen(true)}
                        className="h-9 px-4 text-xs font-semibold rounded-xl gradient-brand text-white"
                      >
                        <Plus size={14} className="mr-1.5" /> Add Your First Video
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
            <div className="p-4 border-t border-border/60 bg-muted/10">
              <Pagination
                page={page}
                total={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <VideoIngestionModal
        open={ingestModalOpen}
        onOpenChange={setIngestModalOpen}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['videos'] })
        }}
      />

      <VideoEditModal
        video={editingVideo}
        open={!!editingVideo}
        onOpenChange={(open) => {
          if (!open) setEditingVideo(null)
        }}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['videos'] })
        }}
      />

      <VideoDeleteDialog
        video={deletingVideo}
        open={!!deletingVideo}
        onOpenChange={(open) => {
          if (!open) setDeletingVideo(null)
        }}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['videos'] })
        }}
      />

      <VideoPlayerModal
        video={playingVideo}
        open={!!playingVideo}
        onOpenChange={(open) => {
          if (!open) setPlayingVideo(null)
        }}
      />
    </div>
  )
}

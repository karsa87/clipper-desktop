import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, FileText } from 'lucide-react'
import { videoService } from '@/services/video.service'
import { Input } from '@/shared/components/ui/input'
import { SkeletonTable } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { formatTimestamp } from '@/shared/utils'

export function TranscriptPage() {
  const [params] = useSearchParams()
  const videoIdParam = params.get('videoId')
  const [search, setSearch] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdParam)

  const { data: videos } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  const { data: transcript, isLoading, error } = useQuery({
    queryKey: ['transcript', selectedVideoId],
    queryFn: () => videoService.getTranscript(selectedVideoId!),
    enabled: !!selectedVideoId,
    retry: false,
  })

  const filteredSegments = useMemo(() => {
    if (!transcript) return []
    if (!search.trim()) return transcript.segments
    const q = search.toLowerCase()
    return transcript.segments.filter(s => s.text.toLowerCase().includes(q))
  }, [transcript, search])

  const highlight = (text: string) => {
    if (!search.trim()) return <>{text}</>
    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return <>{parts.map((p, i) => p.toLowerCase() === search.toLowerCase()
      ? <mark key={i} className="bg-primary/30 text-primary rounded-sm px-0.5">{p}</mark> : p)}</>
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-up">
      {!videoIdParam && (
        <div className="w-56 border-r border-border overflow-y-auto shrink-0">
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs font-semibold">Videos</p>
          </div>
          <div className="py-1">
            {(videos?.items ?? []).map((v) => (
              <button key={v.id} onClick={() => setSelectedVideoId(v.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  selectedVideoId === v.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <p className="truncate font-medium">{v.filename}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedVideoId ? (
          <EmptyState icon={<FileText size={22} />} title="Select a video" description="Choose a video to view its transcript." className="flex-1 flex flex-col justify-center" />
        ) : isLoading ? (
          <div className="p-5"><SkeletonTable rows={8} /></div>
        ) : error ? (
          <EmptyState icon={<FileText size={22} />} title="No transcript found" description="Transcribe the video first from its detail page." className="flex-1 flex flex-col justify-center" />
        ) : transcript ? (
          <>
            <div className="px-5 py-3 border-b border-border space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Transcript · {transcript.language?.toUpperCase()}</p>
                <p className="text-[11px] text-muted-foreground">{filteredSegments.length} / {transcript.segments.length} segments</p>
              </div>
              <Input leftIcon={<Search size={13} />} placeholder="Search transcript…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
              {filteredSegments.map((seg, i) => (
                <div key={i} className="flex gap-3 group px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0 pt-0.5 w-20 tabular-nums">
                    {formatTimestamp(seg.start)}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{highlight(seg.text)}</p>
                </div>
              ))}
              {filteredSegments.length === 0 && search && (
                <p className="text-xs text-muted-foreground text-center py-8">No matches for "{search}"</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

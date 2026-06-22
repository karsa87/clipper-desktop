import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Zap, RefreshCw } from 'lucide-react'
import { videoService } from '@/services/video.service'
import { toast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/button'
import { ScoreBadge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { SkeletonCard } from '@/shared/components/ui/skeleton'
import { EmptyState } from '@/shared/components/ui/empty-state'
import { formatTimestamp } from '@/shared/utils'

export function HooksPage() {
  const [params] = useSearchParams()
  const videoIdParam = params.get('videoId')
  const qc = useQueryClient()
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdParam)

  const { data: videos } = useQuery({
    queryKey: ['videos', 'list'],
    queryFn: () => videoService.list(100),
  })

  const { data: hooksData, isLoading, error } = useQuery({
    queryKey: ['hooks', selectedVideoId],
    queryFn: () => videoService.listHooks(selectedVideoId!),
    enabled: !!selectedVideoId,
    retry: false,
  })

  const detectMutation = useMutation({
    mutationFn: () => videoService.detectHooks(selectedVideoId!, { max_hooks: 10, min_duration: 60, max_duration: 90 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hooks', selectedVideoId] }); toast.success('Hooks detected') },
    onError: (e: Error) => toast.error('Hook detection failed', e.message),
  })

  const hooks = hooksData?.items ?? []
  const sorted = [...hooks].sort((a, b) => b.score - a.score)

  return (
    <div className="flex h-full overflow-hidden animate-fade-up">
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

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedVideoId ? (
          <EmptyState icon={<Zap size={22} />} title="Select a video" description="Choose a video to view its detected hooks." className="flex-1 flex flex-col justify-center" />
        ) : (
          <>
            <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs font-semibold">Hook Detection</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{hooks.length} hook{hooks.length !== 1 ? 's' : ''} detected</p>
              </div>
              <Button size="sm" variant="outline" loading={detectMutation.isPending} onClick={() => detectMutation.mutate()}>
                <RefreshCw size={11} /> {hooks.length > 0 ? 'Re-detect' : 'Detect Hooks'}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {isLoading ? <><SkeletonCard /><SkeletonCard /></> : error ? (
                <EmptyState icon={<Zap size={22} />} title="No hooks found" description="Run hook detection first." />
              ) : sorted.length === 0 ? (
                <EmptyState icon={<Zap size={22} />} title="No hooks detected" description="Run AI hook detection to find viral moments."
                  action={<Button size="sm" loading={detectMutation.isPending} onClick={() => detectMutation.mutate()}><Zap size={11}/> Detect Hooks</Button>}
                />
              ) : sorted.map((hook, i) => (
                <Card key={hook.id} className="hover:border-border/80 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">#{i+1}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatTimestamp(hook.start_time)} → {formatTimestamp(hook.end_time)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">({Math.round(hook.end_time - hook.start_time)}s)</span>
                      </div>
                      <ScoreBadge score={hook.score} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Reason</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{hook.reason}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 border border-border">
                      <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Excerpt</p>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">"{hook.transcript_excerpt}"</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

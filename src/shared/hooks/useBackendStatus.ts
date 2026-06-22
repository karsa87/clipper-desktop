import { useQuery } from '@tanstack/react-query'
import { healthService } from '@/services/video.service'

export function useBackendStatus() {
  const { data: online = false } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.check,
    refetchInterval: 15_000,
    retry: false,
  })
  return { online }
}

import { getApiClient } from './api'
import type {
  APIResponse,
  Video,
  VideoListResponse,
  VideoUploadResponse,
  Transcript,
  TranscribeRequest,
  Hook,
  HookDetectionRequest,
  HookListResponse,
  Clip,
  ClipListResponse,
  ClipExtractionRequest,
  ClipExportRequest,
} from '@/types'

export const videoService = {
  async upload(file: File): Promise<VideoUploadResponse> {
    const form = new FormData()
    form.append('file', file)
    const res = await getApiClient().post<APIResponse<VideoUploadResponse>>(
      '/api/v1/videos/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data.data!
  },

  async list(limit = 50, offset = 0): Promise<VideoListResponse> {
    const res = await getApiClient().get<APIResponse<VideoListResponse>>(
      `/api/v1/videos?limit=${limit}&offset=${offset}`
    )
    return res.data.data!
  },

  async get(id: string): Promise<Video> {
    const res = await getApiClient().get<APIResponse<Video>>(`/api/v1/videos/${id}`)
    return res.data.data!
  },

  async delete(id: string): Promise<void> {
    await getApiClient().delete(`/api/v1/videos/${id}`)
  },

  // Transcript
  async transcribe(videoId: string, body?: TranscribeRequest): Promise<Transcript> {
    const res = await getApiClient().post<APIResponse<Transcript>>(
      `/api/v1/videos/${videoId}/transcript`,
      body ?? {}
    )
    return res.data.data!
  },

  async getTranscript(videoId: string): Promise<Transcript> {
    const res = await getApiClient().get<APIResponse<Transcript>>(
      `/api/v1/videos/${videoId}/transcript`
    )
    return res.data.data!
  },

  // Hooks
  async detectHooks(videoId: string, body?: HookDetectionRequest): Promise<HookListResponse> {
    const res = await getApiClient().post<APIResponse<HookListResponse>>(
      `/api/v1/videos/${videoId}/hooks`,
      body ?? {}
    )
    return res.data.data!
  },

  async listHooks(videoId: string): Promise<HookListResponse> {
    const res = await getApiClient().get<APIResponse<HookListResponse>>(
      `/api/v1/videos/${videoId}/hooks`
    )
    return res.data.data!
  },

  // Clips
  async extractClips(videoId: string, body: ClipExtractionRequest): Promise<ClipListResponse> {
    const res = await getApiClient().post<APIResponse<ClipListResponse>>(
      `/api/v1/videos/${videoId}/clips`,
      body
    )
    return res.data.data!
  },

  async listClips(videoId: string): Promise<ClipListResponse> {
    const res = await getApiClient().get<APIResponse<ClipListResponse>>(
      `/api/v1/videos/${videoId}/clips`
    )
    return res.data.data!
  },
}

export const clipService = {
  async get(clipId: string): Promise<Clip> {
    const res = await getApiClient().get<APIResponse<Clip>>(`/api/v1/clips/${clipId}`)
    return res.data.data!
  },

  async export(clipId: string, body?: ClipExportRequest): Promise<Record<string, unknown>> {
    const res = await getApiClient().post<APIResponse<Record<string, unknown>>>(
      `/api/v1/clips/${clipId}/export`,
      body ?? { burn_subtitles: true, generate_title: true, generate_caption: true }
    )
    return res.data.data!
  },

  async generateSubtitle(clipId: string): Promise<{ subtitle_path: string }> {
    const res = await getApiClient().post<APIResponse<{ subtitle_path: string }>>(
      `/api/v1/clips/${clipId}/subtitle`
    )
    return res.data.data!
  },

  getDownloadUrl(filePath: string): string {
    const { backendUrl } = (window as Window & { __settingsStore?: { backendUrl: string } })
      .__settingsStore ?? { backendUrl: 'http://localhost:8000' }
    return `${backendUrl}/files/${encodeURIComponent(filePath)}`
  },
}

export const healthService = {
  async check(): Promise<boolean> {
    try {
      const res = await getApiClient().get('/api/v1/health')
      return res.data?.success === true
    } catch {
      return false
    }
  },
}

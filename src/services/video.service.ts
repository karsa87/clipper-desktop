import { getApiClient } from './api'
import type {
  APIResponse,
  Video,
  VideoListResponse,
  VideoUploadResponse,
  VideoPreviewResponse,
  VideoImportUrlRequest,
  VideoUpdateRequest,
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
  async upload(
    file: File,
    metadata?: {
      title?: string
      creator_account?: string
      host_names?: string[]
      guest_stars?: string[]
    }
  ): Promise<VideoUploadResponse> {
    const form = new FormData()
    form.append('file', file)
    if (metadata?.title) form.append('title', metadata.title)
    if (metadata?.creator_account) form.append('creator_account', metadata.creator_account)
    if (metadata?.host_names && metadata.host_names.length > 0) {
      form.append('host_names', JSON.stringify(metadata.host_names))
    }
    if (metadata?.guest_stars && metadata.guest_stars.length > 0) {
      form.append('guest_stars', JSON.stringify(metadata.guest_stars))
    }

    const res = await getApiClient().post<APIResponse<VideoUploadResponse>>(
      '/api/v1/videos/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data.data!
  },

  async previewUrl(url: string): Promise<VideoPreviewResponse> {
    const res = await getApiClient().post<APIResponse<VideoPreviewResponse>>(
      '/api/v1/videos/preview-url',
      { url }
    )
    return res.data.data!
  },

  async importUrl(payload: VideoImportUrlRequest): Promise<Video> {
    const res = await getApiClient().post<APIResponse<Video>>(
      '/api/v1/videos/import-url',
      payload
    )
    return res.data.data!
  },

  async updateDetails(id: string, payload: VideoUpdateRequest): Promise<Video> {
    const res = await getApiClient().patch<APIResponse<Video>>(
      `/api/v1/videos/${id}`,
      payload
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

  async delete(id: string): Promise<{ video_id: string; deleted_files_count: number }> {
    const res = await getApiClient().delete<APIResponse<{ video_id: string; deleted_files_count: number }>>(
      `/api/v1/videos/${id}`
    )
    return res.data.data!
  },

  getStreamUrl(videoId: string): string {
    const { backendUrl } = (window as Window & { __settingsStore?: { backendUrl: string } })
      .__settingsStore ?? { backendUrl: 'http://localhost:8000' }
    return `${backendUrl}/api/v1/videos/${videoId}/stream`
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

  async updateTranscript(videoId: string, segments: { start: number; end: number; text: string }[]): Promise<Transcript> {
    const res = await getApiClient().put<APIResponse<Transcript>>(
      `/api/v1/videos/${videoId}/transcript`,
      { segments }
    )
    return res.data.data!
  },

  getSubtitleDownloadUrl(videoId: string, format: 'srt' | 'ass' = 'srt'): string {
    const { backendUrl } = (window as Window & { __settingsStore?: { backendUrl: string } })
      .__settingsStore ?? { backendUrl: 'http://localhost:8000' }
    return `${backendUrl}/api/v1/videos/${videoId}/transcript/download?format=${format}`
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

  getClipDownloadUrl(clipId: string): string {
    const { backendUrl } = (window as Window & { __settingsStore?: { backendUrl: string } })
      .__settingsStore ?? { backendUrl: 'http://localhost:8000' }
    return `${backendUrl}/api/v1/clips/${clipId}/download`
  },

  getClipStreamUrl(clipId: string): string {
    const { backendUrl } = (window as Window & { __settingsStore?: { backendUrl: string } })
      .__settingsStore ?? { backendUrl: 'http://localhost:8000' }
    return `${backendUrl}/api/v1/clips/${clipId}/stream`
  },

  getClipSubtitleDownloadUrl(clipId: string, format: 'srt' | 'ass' = 'srt'): string {
    const { backendUrl } = (window as Window & { __settingsStore?: { backendUrl: string } })
      .__settingsStore ?? { backendUrl: 'http://localhost:8000' }
    return `${backendUrl}/api/v1/clips/${clipId}/subtitles/download?format=${format}`
  },

  async delete(clipId: string): Promise<{ clip_id: string; deleted_files_count: number }> {
    const res = await getApiClient().delete<APIResponse<{ clip_id: string; deleted_files_count: number }>>(
      `/api/v1/clips/${clipId}`
    )
    return res.data.data!
  },

  async reframe(
    clipId: string,
    framingMode: import('@/types').FramingMode,
    panStyle?: import('@/types').PanStyle,
  ): Promise<Clip> {
    const res = await getApiClient().post<APIResponse<Clip>>(
      `/api/v1/clips/${clipId}/reframe`,
      { framing_mode: framingMode, pan_style: panStyle }
    )
    return res.data.data!
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

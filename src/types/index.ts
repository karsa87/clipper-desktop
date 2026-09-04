// ─── API Response Wrapper ────────────────────────────────────────────────────
export interface APIResponse<T> {
  success: boolean
  message: string
  data: T | null
}

// ─── Video ───────────────────────────────────────────────────────────────────
export type VideoSourceType = 'local' | 'url'

export type VideoStatus =
  | 'queued'
  | 'downloading'
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'analyzing'
  | 'analyzed'
  | 'clipping'
  | 'completed'
  | 'failed'

export interface Video {
  id: string
  filename: string
  file_path: string
  title: string
  source_type: VideoSourceType
  source_url?: string | null
  creator_account?: string | null
  host_names: string[]
  guest_stars: string[]
  duration_seconds: number | null
  fps: number | null
  width: number | null
  height: number | null
  status: VideoStatus
  download_progress?: number
  error_message?: string | null
  created_at: string
  updated_at: string
}

export interface VideoUploadResponse {
  video_id: string
  filename: string
  title: string
  status: VideoStatus
}

export interface VideoPreviewResponse {
  title?: string | null
  channel?: string | null
  thumbnail?: string | null
  duration_seconds?: number | null
  platform?: string | null
}

export interface VideoImportUrlRequest {
  url: string
  title?: string
  creator_account?: string
  host_names?: string[]
  guest_stars?: string[]
}

export interface VideoUpdateRequest {
  title?: string
  creator_account?: string
  host_names?: string[]
  guest_stars?: string[]
}

export interface VideoListResponse {
  items: Video[]
  total: number
}

// ─── Transcript ───────────────────────────────────────────────────────────────
export interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence: number | null
}

export interface Transcript {
  id: string
  video_id: string
  language: string
  full_text: string
  segments: TranscriptSegment[]
  created_at: string
}

export interface TranscribeRequest {
  language?: string | null
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export interface Hook {
  id: string
  video_id: string
  start_time: number
  end_time: number
  score: number
  reason: string
  transcript_excerpt: string
  created_at: string
}

export interface HookDetectionRequest {
  max_hooks?: number
  min_duration?: number
  max_duration?: number
}

export interface HookListResponse {
  items: Hook[]
  total: number
}

// ─── Clip ─────────────────────────────────────────────────────────────────────
export type ClipStatus = 'pending' | 'extracted' | 'subtitled' | 'exported' | 'failed'
export type TargetPlatform = 'youtube_shorts' | 'tiktok' | 'instagram_reels' | 'facebook_reels'

export interface Clip {
  id: string
  video_id: string
  hook_id: string
  start_time: number
  end_time: number
  file_path: string | null
  subtitle_path: string | null
  title: string | null
  caption: string | null
  hashtags: string[]
  target_platform: TargetPlatform
  status: ClipStatus
  created_at: string
}

export interface ClipExtractionRequest {
  hook_ids: string[]
  target_platform: TargetPlatform
}

export interface ClipExportRequest {
  burn_subtitles?: boolean
  generate_title?: boolean
  generate_caption?: boolean
}

export interface ClipListResponse {
  items: Clip[]
  total: number
}

// ─── Settings ────────────────────────────────────────────────────────────────
export interface AppSettings {
  backendUrl: string
  geminiApiKey: string
  whisperModelSize: string
  outputDir: string
  uploadDir: string
}

// ─── Project (client-side only, stored in Zustand + localStorage) ────────────
export interface Project {
  id: string
  name: string
  description: string
  color: string
  videoIds: string[]
  createdAt: string
  updatedAt: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalVideos: number
  totalClips: number
  totalProjects: number
  recentVideos: Video[]
}

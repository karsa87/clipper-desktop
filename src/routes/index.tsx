import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage'
import { VideosPage } from '@/features/videos/VideosPage'
import { VideoDetailPage } from '@/features/videos/VideoDetailPage'
import { ClipsPage } from '@/features/clips/ClipsPage'
import { TranscriptPage } from '@/features/transcript/TranscriptPage'
import { HooksPage } from '@/features/hooks/HooksPage'
import { ExportsPage } from '@/features/exports/ExportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'videos', element: <VideosPage /> },
      { path: 'videos/:id', element: <VideoDetailPage /> },
      { path: 'clips', element: <ClipsPage /> },
      { path: 'transcript', element: <TranscriptPage /> },
      { path: 'hooks', element: <HooksPage /> },
      { path: 'exports', element: <ExportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

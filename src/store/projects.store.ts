import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project } from '@/types'

const PROJECT_COLORS = [
  '#7c6af7', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
]

interface ProjectStore {
  projects: Project[]
  createProject: (name: string, description?: string) => Project
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => void
  deleteProject: (id: string) => void
  addVideoToProject: (projectId: string, videoId: string) => void
  removeVideoFromProject: (projectId: string, videoId: string) => void
  getProject: (id: string) => Project | undefined
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],

      createProject: (name, description = '') => {
        const project: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          color: PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
          videoIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({ projects: [project, ...s.projects] }))
        return project
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addVideoToProject: (projectId, videoId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId && !p.videoIds.includes(videoId)
              ? { ...p, videoIds: [...p.videoIds, videoId], updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      removeVideoFromProject: (projectId, videoId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, videoIds: p.videoIds.filter((v) => v !== videoId), updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    { name: 'clipper-projects' }
  )
)

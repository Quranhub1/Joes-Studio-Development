import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Templates
  templates: [],
  selectedTemplateId: null,
  
  // Projects
  projects: [],
  activeProjectId: null,
  
  // UI State
  isEditing: false,
  previewMode: false,
  
  // Batch Processing
  batchSize: 0,
  rowsPerPage: 6,
  cardsPerPage: 6,
  resolution: 300,
  
  // User Data
  user: {
    id: null,
    name: '',
    email: '',
  },
  
  // Actions
  setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
  selectTemplate: (id) => set({ selectedTemplateId: id }),
  toggleEdit: (is) => set({ isEditing: !is }),
  saveProject: (projectId, updates) => set({
    ...get().projects,
    [projectId]: { ...get().projects[projectId], ...updates }
  }),
  deleteProject: (projectId) => set({ projects: get().projects.filter(p => p.id !== projectId) }),
  addProject: (name) => set({ projects: [...get().projects, { id: Date.now(), name }] }),
  
  // Cloud Sync (placeholder)
  syncStatus: 'idle',
  syncProgress: 0,
}));
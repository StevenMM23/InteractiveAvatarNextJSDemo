import { create } from "zustand"

export interface AvatarSession {
  sessionId: string
  message: string
  formData: any
  timestamp: number
}

export interface BCGSession extends AvatarSession {
  conversationId: string
  selectedProduct: string
}

export interface KnowledgeSession extends AvatarSession {
  knowledgeId: string
}

export interface AvatarStore {
  // 🔹 Sessions por tipo de avatar
  gestorCobranza: AvatarSession | null
  bcgProduct: BCGSession | null
  volcano: KnowledgeSession | null
  onboarding: KnowledgeSession | null
  microsoft: KnowledgeSession | null
  // 🔹 Estado global de vista inmersiva
  isImmersive: boolean
  setIsImmersive: (value: boolean) => void
  // 🔹 Avatar actual en uso
  currentAvatarType: string | null

  // 🔹 Manejo de imágenes en memoria (no persistentes)
  generatedImages: string[]
  isImageModalOpen: boolean
  selectedImage: string | null
  setSelectedImage: (img: string | null) => void
  // 🔹 Actions
  setGestorCobranzaSession: (session: AvatarSession) => void
  setBCGProductSession: (session: BCGSession) => void
  setVolcanoSession: (session: KnowledgeSession) => void
  setOnboardingSession: (session: KnowledgeSession) => void
  setMicrosoftSession: (session: KnowledgeSession) => void

  setCurrentAvatarType: (avatarType: string | null) => void

  addBCGImage: (imageBase64: string) => void
  clearImages: () => void
  setImageModalOpen: (open: boolean) => void

  clearSession: (
    avatarType:
      | "gestorCobranza"
      | "bcgProduct"
      | "volcano"
      | "onboarding"
      | "microsoft"
  ) => void
  clearAllSessions: () => void
  getSession: (
    avatarType: string
  ) => AvatarSession | BCGSession | KnowledgeSession | null
}

export const useAvatarStore = create<AvatarStore>((set, get) => ({
  gestorCobranza: null,
  bcgProduct: null,
  volcano: null,
  onboarding: null,
  microsoft: null,
  isImmersive: false,
  setIsImmersive: (value) => set({ isImmersive: value }),
  currentAvatarType: null,

  // 🚀 Estado de imágenes (no persistente)
  generatedImages: [],
  isImageModalOpen: false,

  // Setters de sesiones
  setGestorCobranzaSession: (session) => set({ gestorCobranza: session }),
  setBCGProductSession: (session) => set({ bcgProduct: session }),
  setVolcanoSession: (session) => set({ volcano: session }),
  setOnboardingSession: (session) => set({ onboarding: session }),
  setMicrosoftSession: (session) => set({ microsoft: session }),
  selectedImage: null,
  setSelectedImage: (img) => set({ selectedImage: img }),
  // Avatar actual
  setCurrentAvatarType: (avatarType) => set({ currentAvatarType: avatarType }),

  // 🚀 Manejo de imágenes
  addBCGImage: (imageBase64) =>
    set((state) => ({
      generatedImages: [...state.generatedImages, imageBase64],
      selectedImage: imageBase64,   // 👈 seleccionar imagen al abrir
      isImageModalOpen: true,
    })),
  clearImages: () => set({ generatedImages: [], isImageModalOpen: false, selectedImage: null }),

  setImageModalOpen: (open) => set({ isImageModalOpen: open }),

  // Limpieza de sesiones
  clearSession: (avatarType) =>
    set({ [avatarType]: null } as unknown as Partial<AvatarStore>),

  clearAllSessions: () =>
    set({
      gestorCobranza: null,
      bcgProduct: null,
      volcano: null,
      onboarding: null,
      microsoft: null,
      currentAvatarType: null,
      generatedImages: [],
      isImageModalOpen: false,
    }),

  // Obtener sesión activa por tipo
  getSession: (avatarType: string) => {
    const state = get()
    switch (avatarType) {
      case "gestor-cobranza":
        return state.gestorCobranza
      case "bcg-product":
        return state.bcgProduct
      case "volcano":
        return state.volcano
      case "gbm-onboarding":
        return state.onboarding
      case "microsoft-services":
        return state.microsoft
      default:
        return null
    }
  },
}))

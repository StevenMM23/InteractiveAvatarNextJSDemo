import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AvatarSession {
  sessionId: string
  message: string
  formData: any
  timestamp: number
}

export interface BCGSession extends AvatarSession {
  conversationId: string
  selectedProduct: string
  generatedImages: string[] // Array de base64 images
}

export interface KnowledgeSession extends AvatarSession {
  knowledgeId: string
}

export interface AvatarStore {
  // Sesiones
  gestorCobranza: AvatarSession | null
  bcgProduct: BCGSession | null
  volcano: KnowledgeSession | null

  // Nuevo: avatar activo actual
  currentAvatarType: "gestor-cobranza" | "bcg-product" | "volcano" | null

  // Actions
  setGestorCobranzaSession: (session: AvatarSession) => void
  setBCGProductSession: (session: BCGSession) => void
  setVolcanoSession: (session: KnowledgeSession) => void
  setCurrentAvatarType: (type: "gestor-cobranza" | "bcg-product" | "volcano" | null) => void

  addBCGImage: (imageBase64: string) => void
  clearSession: (avatarType: "gestor-cobranza" | "bcg-product" | "volcano") => void
  clearAllSessions: () => void
  getSession: (avatarType: string) => AvatarSession | BCGSession | KnowledgeSession | null
}

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set, get) => ({
      gestorCobranza: null,
      bcgProduct: null,
      volcano: null,
      currentAvatarType: null,

      setGestorCobranzaSession: (session) =>
        set(() => ({
          gestorCobranza: session,
          currentAvatarType: "gestor-cobranza",
        })),

      setBCGProductSession: (session) =>
        set(() => ({
          bcgProduct: session,
          currentAvatarType: "bcg-product",
        })),

      setVolcanoSession: (session) =>
        set(() => ({
          volcano: session,
          currentAvatarType: "volcano",
        })),

      setCurrentAvatarType: (type) => set(() => ({ currentAvatarType: type })),

      addBCGImage: (imageBase64) =>
        set((state) => ({
          bcgProduct: state.bcgProduct
            ? { ...state.bcgProduct, generatedImages: [...state.bcgProduct.generatedImages, imageBase64] }
            : null,
        })),

      clearSession: (avatarType) =>
        set((state) => ({
          [avatarType]: null,
          currentAvatarType: state.currentAvatarType === avatarType ? null : state.currentAvatarType,
        })),

      clearAllSessions: () =>
        set({
          gestorCobranza: null,
          bcgProduct: null,
          volcano: null,
          currentAvatarType: null,
        }),

      getSession: (avatarType: string) => {
        const state = get()
        switch (avatarType) {
          case "gestor-cobranza":
            return state.gestorCobranza
          case "bcg-product":
            return state.bcgProduct
          case "volcano":
            return state.volcano
          default:
            return null
        }
      },
    }),
    { name: "avatar-sessions" },
  ),
)

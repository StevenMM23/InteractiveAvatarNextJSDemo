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
  generatedImages: string[]
}

export interface KnowledgeSession extends AvatarSession {
  knowledgeId: string
}

export interface AvatarStore {
  // Sessions
  gestorCobranza: AvatarSession | null
  bcgProduct: BCGSession | null
  volcano: KnowledgeSession | null
  onboarding: KnowledgeSession | null
  microsoft: KnowledgeSession | null

  // Nuevo: avatar seleccionado
  currentAvatarType: string | null

  // Actions
  setGestorCobranzaSession: (session: AvatarSession) => void
  setBCGProductSession: (session: BCGSession) => void
  setVolcanoSession: (session: KnowledgeSession) => void
  setOnboardingSession: (session: KnowledgeSession) => void
  setMicrosoftSession: (session: KnowledgeSession) => void

  setCurrentAvatarType: (avatarType: string | null) => void

  addBCGImage: (imageBase64: string) => void
  clearSession: (avatarType: "gestorCobranza" | "bcgProduct" | "volcano" | "onboarding" | "microsoft") => void
  clearAllSessions: () => void
  getSession: (avatarType: string) => AvatarSession | BCGSession | KnowledgeSession | null
}

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set, get) => ({
      gestorCobranza: null,
      bcgProduct: null,
      volcano: null,
      onboarding: null,
      microsoft: null,

      currentAvatarType: null, // 🔹 Al inicio ningún avatar seleccionado

      setGestorCobranzaSession: (session) =>
        set({ gestorCobranza: session }),
      setBCGProductSession: (session) =>
        set({ bcgProduct: session }),
      setVolcanoSession: (session) =>
        set({ volcano: session }),
      setOnboardingSession: (session) =>
        set({ onboarding: session }),
      setMicrosoftSession: (session) =>
        set({ microsoft: session }),

      setCurrentAvatarType: (avatarType) =>
        set({ currentAvatarType: avatarType }),

      addBCGImage: (imageBase64) =>
        set((state) => ({
          bcgProduct: state.bcgProduct
            ? {
                ...state.bcgProduct,
                generatedImages: [...state.bcgProduct.generatedImages, imageBase64],
              }
            : null,
        })),

      clearSession: (avatarType) =>
        set({ [avatarType]: null } as any),

      clearAllSessions: () =>
        set({
          gestorCobranza: null,
          bcgProduct: null,
          volcano: null,
          onboarding: null,
          microsoft: null,
          currentAvatarType: null, // 🔹 Reset también aquí
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
          case "gbm-onboarding":
            return state.onboarding
          case "microsoft-services":
            return state.microsoft
          default:
            return null
        }
      },
    }),
    {
      name: "avatar-sessions",
    },
  ),
)

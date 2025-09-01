import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AvatarSession {
  sessionId: string
  message: string
  formData: any
  timestamp: number
}

export interface AvatarStore {
  // Sessions for different avatar types
  gestorCobranza: AvatarSession | null
  bcgProduct: AvatarSession | null

  // Actions
  setGestorCobranzaSession: (session: AvatarSession) => void
  setBCGProductSession: (session: AvatarSession) => void
  clearSession: (avatarType: "gestorCobranza" | "bcgProduct") => void
  clearAllSessions: () => void
  getSession: (avatarType: string) => AvatarSession | null
}

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set, get) => ({
      // Initial state
      gestorCobranza: null,
      bcgProduct: null,

      // Actions
      setGestorCobranzaSession: (session) =>
        set((state) => ({
          ...state,
          gestorCobranza: session,
        })),

      setBCGProductSession: (session) =>
        set((state) => ({
          ...state,
          bcgProduct: session,
        })),

      clearSession: (avatarType) =>
        set((state) => ({
          ...state,
          [avatarType]: null,
        })),

      clearAllSessions: () =>
        set({
          gestorCobranza: null,
          bcgProduct: null,
        }),

      getSession: (avatarType: string) => {
        const state = get()
        switch (avatarType) {
          case "gestor-cobranza":
            return state.gestorCobranza
          case "bcg-product":
            return state.bcgProduct
          default:
            return null
        }
      },
    }),
    {
      name: "avatar-sessions", // localStorage key
    },
  ),
)

import axios from "axios"

interface BCGResponse {
  response: string
}

export class GestorCobranzaService {
  private getSession: any

  constructor(getSession: any) {
    this.getSession = getSession
  }

  async sendMessage(userInput: string): Promise<string | null> {
    console.log("[v0] GESTOR - Enviando mensaje:", userInput)
    console.log("[v0] GESTOR - Ruta: /api/gestor-cobranza/chat")

    const session = this.getSession("gestor-cobranza")
    if (!session?.sessionId) {
      console.error("[v0] GESTOR - No session ID found")
      return null
    }

    const requestBody = {
      session_id: session.sessionId,
      user_input: userInput,
    }
    console.log("[v0] GESTOR - Request body:", JSON.stringify(requestBody, null, 2))

    try {
      const response = await axios.post("/api/gestor-cobranza/chat", requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })

      console.log("[v0] GESTOR - Response status:", response.status)
      console.log("[v0] GESTOR - Response data:", response.data)
      return response.data.agent_response
    } catch (error) {
      console.error("[v0] GESTOR - Error:", error)
      
      return null
    }
  }
}

export class BCGService {
  private getSession: any
  private isFirstCall = true

  constructor(getSession: any) {
    this.getSession = getSession
  }

  async sendMessage(userInput: string): Promise<BCGResponse | null> {
    console.log("[v0] BCG - Enviando mensaje:", userInput, "Primera llamada:", this.isFirstCall)
    console.log("[v0] BCG - Ruta directa: http://44.203.3.232:8000/chat")

    const session = this.getSession("bcg-product") as any | null
    if (!session?.conversationId || !session?.selectedProduct) {
      console.error("[v0] BCG - Session inválida:", session)
      return null
    }

    const requestBody = this.isFirstCall
      ? {
          user_input: "",
          selected_product: session.selectedProduct,
          conversation_id: session.conversationId,
        }
      : {
          user_input: userInput,
          conversation_id: session.conversationId,
        }

    console.log("[v0] BCG - Request body:", JSON.stringify(requestBody, null, 2))

    try {
      const response = await axios.post("http://44.203.3.232:8000/chat", requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })

      console.log("[v0] BCG - Response status:", response.status)
      console.log("[v0] BCG - Response headers:", response.headers)
      console.log("[v0] BCG - Response data:", response.data)

      if (this.isFirstCall) {
        this.isFirstCall = false
        console.log("[v0] BCG - Primera llamada completada, siguientes llamadas serán normales")
      }

      return {
        response: response.data.response || "",
      }
    } catch (error) {
      console.error("[v0] BCG - Error:", error)
      
      return null
    }
  }

  async initializeChat(): Promise<BCGResponse | null> {
    if (this.isFirstCall) {
      console.log("[v0] BCG - Inicializando chat con mensaje vacío")
      return await this.sendMessage("")
    }
    return null
  }
}

export class BCGProductService {
  static async getAvailableProducts(): Promise<string[] | null> {
    console.log("[v0] BCG_PRODUCTS - Obteniendo productos disponibles")
    console.log("[v0] BCG_PRODUCTS - Ruta directa: http://44.203.3.232:8000/available-products")

    try {
      const response = await axios.get("http://44.203.3.232:8000/available-products", {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      })

      console.log("[v0] BCG_PRODUCTS - Response status:", response.status)
      console.log("[v0] BCG_PRODUCTS - Response data:", response.data)
      return response.data.products
    } catch (error) {
      console.error("[v0] BCG_PRODUCTS - Error:", error)
     
      return null
    }
  }
}

export type { BCGResponse }

export const getAvatarService = (avatarType: string) => {
  console.log("🎯 [getAvatarService] Selecting service for:", avatarType)

  if (avatarType === "bcg-product") {
    console.log("🔵 [getAvatarService] Selected: BCGService")
    const { useAvatarStore } = require("../store/avatarStore")
    const { getSession } = useAvatarStore.getState()
    return new BCGService(getSession)
  } else {
    console.log("🟢 [getAvatarService] Selected: GestorCobranzaService")
    const { useAvatarStore } = require("../store/avatarStore")
    const { getSession } = useAvatarStore.getState()
    return new GestorCobranzaService(getSession)
  }
}

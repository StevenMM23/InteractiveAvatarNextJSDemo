import type { DemoDefinition } from "@/types/demo"
import { GestorCobranzaSchema, BCGProductSchema } from "@/schemas/validation"

// Demo registry - easy to add new demos
export const demoRegistry: DemoDefinition[] = [
  {
    id: "volcano",
    name: "Volcano Innovation Summit",
    description: "Avatar con base de conocimiento integrada sobre el Volcano Innovation Summit.",
    requiresForm: false,
    icon: "Flame",
    avatarConfig: {
      sessionType: "voice",
      autoStartMicrophone: true,
      enableMute: true,
      greeting:
        "¡Hola! Soy el asistente del Volcano Innovation Summit. ¿Quieres saber sobre agenda, speakers o startups?",
    },
  },

  {
    id: "gbm-onboarding",
    name: "GBM Onboarding",
    description: "Avatar especializado en inducción corporativa de GBM con base de conocimiento integrada",
    requiresForm: false,
    icon: "GraduationCap",
    avatarConfig: {
      sessionType: "voice",
      autoStartMicrophone: true,
      enableMute: true,
      greeting:
        "Bienvenido a GBM. Estoy aquí para acompañarte en tu proceso de inducción corporativa. ¿Te gustaría conocer sobre nuestra historia, misión, valores o cultura organizacional?",
    },
  },
  {
    id: "microsoft-services",
    name: "Microsoft Azure AI Services",
    description: "Avatar con base de conocimiento integrada sobre los servicios de inteligencia artificial de Azure.",
    requiresForm: false,
    icon: "Cloud",
    avatarConfig: {
      sessionType: "voice",
      autoStartMicrophone: true,
      enableMute: true,
      greeting:
        "Hola, soy tu asistente de Microsoft Azure AI Services. Puedo contarte sobre nuestras soluciones de inteligencia artificial, ¿quieres empezar?",
    },
  },
  {
    id: "gestor-cobranza",
    name: "Gestor de Cobranza",
    description: "Avatar especializado en gestión de cobranza con validación de datos del cliente",
    requiresForm: true,
    formSchema: GestorCobranzaSchema,
    icon: "CreditCard",
    avatarConfig: {
      sessionType: "voice",
      autoStartMicrophone: true,
      enableMute: true,
      greeting: "Hola, soy tu asistente de cobranza. ¿En qué puedo ayudarte hoy?",
    },
    status: "beta",
  },

  {
    id: "bcg-product",
    name: "BCG – Análisis de portafolio",
    description:
      "Avatar que realiza análisis BCG (crecimiento, participación y reporte) a partir de un producto seleccionado.",
    requiresForm: true,
    formSchema: BCGProductSchema,
    icon: "TrendingUp",
    avatarConfig: {
      sessionType: "voice",
      autoStartMicrophone: true,
      enableMute: true,
      greeting:
        "Selecciona un producto para iniciar. Luego pide un análisis a la vez: comparar ventas por año, ver ventas anuales del producto, calcular BCG o generar reporte.",
    },
    status: "beta",
  },
]

// Helper functions
export const getDemoById = (id: string): DemoDefinition | undefined => {
  return demoRegistry.find((demo) => demo.id === id)
}

export const getFormSchema = (demoId: string) => {
  const demo = getDemoById(demoId)
  return demo?.formSchema
}

export const getDemosRequiringForm = (): DemoDefinition[] => {
  return demoRegistry.filter((demo) => demo.requiresForm)
}

export const getDemosWithoutForm = (): DemoDefinition[] => {
  return demoRegistry.filter((demo) => !demo.requiresForm)
}

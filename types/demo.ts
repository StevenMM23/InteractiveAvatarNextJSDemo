export interface DemoDefinition {
  id: string
  name: string
  description: string
  requiresForm: boolean
  formSchema?: any
  icon: string
  avatarConfig: {
    sessionType: "voice" | "text"
    autoStartMicrophone: boolean
    enableMute: boolean
    greeting: string
  }
  isConfigurable?: boolean // Added configurable flag for avatars
}

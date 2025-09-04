import { AvatarQuality, VoiceChatTransport, StartAvatarRequest } from "@heygen/streaming-avatar"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Info } from "lucide-react"
import { STT_LANGUAGE_LIST } from "@/app/lib/constants"
import { LANGUAGE_LABELS_ES } from "@/utils/languageUtils"

const QUALITY_LABELS: Record<AvatarQuality, string> = {
  [AvatarQuality.Low]: "Baja",
  [AvatarQuality.Medium]: "Media",
  [AvatarQuality.High]: "Alta",
}

export type AdvancedConfig = Pick<StartAvatarRequest, "language" | "quality" | "voiceChatTransport">

interface AdvancedSettingsProps {
  config: AdvancedConfig
  onLanguageChange: (language: string) => void
  onQualityChange: (quality: AvatarQuality) => void
  onTransportChange: (transport: VoiceChatTransport) => void
}

export function AdvancedSettings({
  config,
  onLanguageChange,
  onQualityChange,
  onTransportChange
}: AdvancedSettingsProps) {
  return (
    <div className="w-full p-8 lg:p-12 bg-card rounded-3xl border border-border shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Idioma */}
        <div className="flex flex-col gap-4">
          <label className="text-lg lg:text-2xl font-semibold text-foreground">Idioma</label>
          <Select onValueChange={onLanguageChange} value={config.language}>
            <SelectTrigger className="min-h-[3.5rem] lg:min-h-[5rem] px-6 py-3 text-lg lg:text-2xl bg-card border rounded-xl">
              <SelectValue placeholder="Selecciona un idioma">
                {config.language ? LANGUAGE_LABELS_ES[config.language] || config.language : "Idioma no definido"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="text-lg lg:text-2xl">
              {STT_LANGUAGE_LIST.map((lang) => (
                <SelectItem key={lang.key} value={lang.value}>
                  {LANGUAGE_LABELS_ES[lang.value] || lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calidad */}
        <div className="flex flex-col gap-4">
          <label className="text-lg lg:text-2xl font-semibold text-foreground">Calidad de Video</label>
          <Select onValueChange={(val) => onQualityChange(val as AvatarQuality)} value={config.quality}>
            <SelectTrigger className="min-h-[3.5rem] lg:min-h-[5rem] px-6 py-3 text-lg lg:text-2xl bg-card border rounded-xl">
              <SelectValue placeholder="Selecciona calidad" />
            </SelectTrigger>
            <SelectContent className="text-lg lg:text-2xl">
              {Object.values(AvatarQuality).map((q) => (
                <SelectItem key={q} value={q}>
                  {QUALITY_LABELS[q]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Opciones avanzadas */}
      <Accordion type="single" collapsible className="mt-8">
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-lg lg:text-xl font-semibold text-foreground">
            Opciones Avanzadas
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="flex flex-col gap-4">
              <label className="text-lg lg:text-2xl font-semibold flex items-center gap-3">
                Transporte de Voz
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-6 h-6 lg:w-8 lg:h-8 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md text-base lg:text-xl leading-relaxed">
                      <p><strong>WebSocket:</strong> Conexión directa, simple y rápida.</p>
                      <p><strong>LiveKit:</strong> Ideal para múltiples usuarios y casos avanzados.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select
                onValueChange={(val) => onTransportChange(val as VoiceChatTransport)}
                value={config.voiceChatTransport}
              >
                <SelectTrigger className="min-h-[3.5rem] lg:min-h-[5rem] px-6 py-3 text-lg lg:text-2xl bg-card border rounded-xl">
                  <SelectValue placeholder="Selecciona transporte" />
                </SelectTrigger>
                <SelectContent className="text-lg lg:text-2xl">
                  {Object.values(VoiceChatTransport).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

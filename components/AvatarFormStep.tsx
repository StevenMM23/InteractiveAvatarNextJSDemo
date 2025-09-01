"use client"
import type { DemoDefinition } from "../types/demo"
import { GestorCobranzaForm } from "./forms/GestorCobranzaForm"
import { BCGForm } from "./forms/BCGForm"

interface AvatarFormStepProps {
  demoDefinition: DemoDefinition
  onSubmit: (data: any) => void
  onBack: () => void
}

export function AvatarFormStep({ demoDefinition, onSubmit, onBack }: AvatarFormStepProps) {
  const renderForm = () => {
    switch (demoDefinition.id) {
      case "gestor-cobranza":
        return <GestorCobranzaForm onSubmit={onSubmit} onBack={onBack} />

      case "bcg-product":
        return <BCGForm onSubmit={onSubmit} onBack={onBack} />

      default:
        return (
          <div className="max-w-md mx-auto p-6 text-center">
            <p>Formulario no disponible para este avatar</p>
            <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-200 rounded">
              Volver
            </button>
          </div>
        )
    }
  }

  return renderForm()
}

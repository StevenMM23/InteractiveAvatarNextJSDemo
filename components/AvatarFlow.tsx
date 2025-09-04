"use client"

import { useState } from "react"
import { AvatarSelector } from "./AvatarSelector"
import { AvatarFormStep } from "./AvatarFormStep"
import InteractiveAvatar from "./InteractiveAvatar"
import type { DemoDefinition } from "../types/demo"

type FlowStep = "selection" | "form" | "avatar"

export function AvatarFlow() {
  const [currentStep, setCurrentStep] = useState<FlowStep>("selection")
  const [selectedDemo, setSelectedDemo] = useState<DemoDefinition | null>(null)
  const [formData, setFormData] = useState<any>(null)

  const handleAvatarSelection = (demo: DemoDefinition) => {
    setSelectedDemo(demo)
    // Si el avatar requiere formulario, ir al paso de formulario
    if (demo.requiresForm) {
      setCurrentStep("form")
    } else {
      // Si no requiere formulario, ir directamente al avatar
      setCurrentStep("avatar")
    }
  }

  const handleFormSubmit = (data: any) => {
    setFormData(data)
    setCurrentStep("avatar")
  }

  const handleBackToSelection = () => {
    setCurrentStep("selection")
    setSelectedDemo(null)
    setFormData(null)
  }

  const handleBackToForm = () => {
    if (selectedDemo?.requiresForm) {
      setCurrentStep("form")
    } else {
      setCurrentStep("selection")
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "selection":
        return <AvatarSelector onSelectAvatar={handleAvatarSelection} selectedAvatar={selectedDemo || undefined} />

      case "form":
        if (!selectedDemo) return null
        return (
          <AvatarFormStep demoDefinition={selectedDemo} onSubmit={handleFormSubmit} onBack={handleBackToSelection} />
        )

      case "avatar":
        if (!selectedDemo) return null
        return <InteractiveAvatar selectedDemo={selectedDemo} formData={formData} onBack={handleBackToForm} />

      default:
        return null
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      {renderCurrentStep()}
    </div>
  )
}

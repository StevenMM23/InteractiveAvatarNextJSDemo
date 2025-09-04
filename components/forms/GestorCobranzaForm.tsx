"use client"

import { Formik, Form, Field, ErrorMessage } from "formik"
import * as Yup from "yup"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAvatarStore } from "../../store/avatarStore"
import { useState } from "react"

const validationSchema = Yup.object({
  debtorName: Yup.string().required("El nombre del deudor es requerido"),
  debtAmount: Yup.number().min(0, "El monto debe ser mayor o igual a 0").required("El monto de la deuda es requerido"),
  discountPercentage: Yup.number()
    .min(0, "El porcentaje debe ser mayor o igual a 0")
    .max(100, "El porcentaje no puede ser mayor a 100")
    .required("El porcentaje de descuento es requerido"),
  lateFee: Yup.number().min(0, "La multa debe ser mayor o igual a 0").required("La multa por retraso es requerida"),
})

type GestorCobranzaData = {
  debtorName: string
  debtAmount: number
  discountPercentage: number
  lateFee: number
}

interface GestorCobranzaFormProps {
  onSubmit: (data: GestorCobranzaData) => void
  onBack: () => void
}

export function GestorCobranzaForm({ onSubmit, onBack }: GestorCobranzaFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { setGestorCobranzaSession } = useAvatarStore()

  const initialValues: GestorCobranzaData = {
    debtorName: "",
    debtAmount: 0,
    discountPercentage: 0,
    lateFee: 0,
  }

  const handleSubmit = async (values: GestorCobranzaData) => {
    setIsLoading(true)
    try {
      const apiPayload = {
        nombre_deudor: values.debtorName,
        monto_deuda: values.debtAmount,
        porcentaje_descuento: values.discountPercentage,
        multa_atraso: values.lateFee,
      }

      const response = await fetch("/api/gestor-cobranza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.session_id && result.message) {
        const session = {
          sessionId: result.session_id,
          message: result.message,
          formData: values,
          timestamp: Date.now(),
        }
        setGestorCobranzaSession(session)
        onSubmit(values)
      } else {
        throw new Error("La API no devolvió session_id o message")
      }
    } catch (error) {
      alert(`Error al conectar con el servidor: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-start lg:items-center justify-center">
      <div className="container w-full max-w-5xl px-6 md:px-12 py-12 lg:py-0">
        {/* Header */}
        <div className="flex items-center gap-6 mb-12">
          <Button
            variant="ghost"
            size="lg"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground p-4"
          >
            <ArrowLeft className="h-8 w-8" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
              Configuración Gestor de Cobranza
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground">
              Proporciona los datos del deudor para personalizar la gestión
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-6">
              <div className="w-full h-full bg-primary/10 rounded-full border-4 border-primary flex items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-primary">💰</span>
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-foreground mb-2">
              Gestor de Cobranza
            </CardTitle>
            <CardDescription className="text-lg md:text-xl text-muted-foreground">
              Sistema inteligente para gestión profesional de cobranzas
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 md:px-12 pb-12">
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
              {({ errors, isValid }) => (
                <Form className="space-y-8">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <Label htmlFor="debtorName" className="text-lg md:text-xl font-semibold text-foreground">
                      Nombre del Deudor
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Field
                      as={Input}
                      id="debtorName"
                      name="debtorName"
                      placeholder="Nombre completo del deudor"
                      className="h-14 md:h-16 text-base md:text-lg bg-background border-border"
                    />
                    <ErrorMessage name="debtorName" component="div" className="text-base text-destructive" />
                  </div>

                  {/* Monto */}
                  <div className="space-y-2">
                    <Label htmlFor="debtAmount" className="text-lg md:text-xl font-semibold text-foreground">
                      Monto de la Deuda
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Field
                      as={Input}
                      id="debtAmount"
                      name="debtAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-14 md:h-16 text-base md:text-lg bg-background border-border"
                    />
                    <ErrorMessage name="debtAmount" component="div" className="text-base text-destructive" />
                  </div>

                  {/* Descuento */}
                  <div className="space-y-2">
                    <Label htmlFor="discountPercentage" className="text-lg md:text-xl font-semibold text-foreground">
                      Porcentaje de Descuento
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Field
                      as={Input}
                      id="discountPercentage"
                      name="discountPercentage"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-14 md:h-16 text-base md:text-lg bg-background border-border"
                    />
                    <ErrorMessage name="discountPercentage" component="div" className="text-base text-destructive" />
                  </div>

                  {/* Multa */}
                  <div className="space-y-2">
                    <Label htmlFor="lateFee" className="text-lg md:text-xl font-semibold text-foreground">
                      Multa por Retraso
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Field
                      as={Input}
                      id="lateFee"
                      name="lateFee"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-14 md:h-16 text-base md:text-lg bg-background border-border"
                    />
                    <ErrorMessage name="lateFee" component="div" className="text-base text-destructive" />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-6 pt-6">
                    <Button
                      type="button"
                      onClick={onBack}
                      variant="outline"
                      size="lg"
                      className="flex-1 h-14 md:h-16 text-base md:text-lg bg-transparent border-2 p-4"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isValid || isLoading}
                      size="lg"
                      className="flex-1 h-14 md:h-16 text-base md:text-lg p-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isLoading ? "Conectando..." : "Comenzar Gestión"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

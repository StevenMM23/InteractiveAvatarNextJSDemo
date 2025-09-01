"use client"
import { Formik, Form, Field, ErrorMessage } from "formik"
import * as Yup from "yup"
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

      console.log("[v0] Enviando datos a API Gestor Cobranza:", apiPayload)

      const response = await fetch("http://44.203.3.232:8002/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[v0] Gestor Cobranza API response:", result)

      if (result.session_id && result.message) {
        const session = {
          sessionId: result.session_id,
          message: result.message,
          formData: values,
          timestamp: Date.now(),
        }

        setGestorCobranzaSession(session)
        console.log("[v0] Sesión guardada en store:", session)

        onSubmit(values)
      } else {
        throw new Error("La API no devolvió session_id o message")
      }
    } catch (error) {
      console.error("[v0] Error en API Gestor Cobranza:", error)
      alert(`Error al conectar con el servidor: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Gestor de Cobranza</CardTitle>
        <CardDescription>Configure los datos para el avatar de gestión de cobranza</CardDescription>
      </CardHeader>
      <CardContent>
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ errors, touched, isValid }) => (
            <Form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="debtAmount">Monto de la Deuda</Label>
                <Field as={Input} id="debtAmount" name="debtAmount" type="number" step="0.01" placeholder="0.00" />
                <ErrorMessage name="debtAmount" component="div" className="text-sm text-red-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="debtorName">Nombre del Deudor</Label>
                <Field as={Input} id="debtorName" name="debtorName" placeholder="Nombre completo" />
                <ErrorMessage name="debtorName" component="div" className="text-sm text-red-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Porcentaje de Descuento</Label>
                <Field
                  as={Input}
                  id="discountPercentage"
                  name="discountPercentage"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                <ErrorMessage name="discountPercentage" component="div" className="text-sm text-red-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lateFee">Multa por Retraso</Label>
                <Field as={Input} id="lateFee" name="lateFee" type="number" step="0.01" placeholder="0.00" />
                <ErrorMessage name="lateFee" component="div" className="text-sm text-red-500" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={onBack} variant="outline" className="flex-1 bg-transparent">
                  Volver
                </Button>
                <Button type="submit" disabled={!isValid || isLoading} className="flex-1">
                  {isLoading ? "Conectando..." : "Continuar"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  )
}

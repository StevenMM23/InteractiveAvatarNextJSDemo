"use client"
import { useState, useEffect } from "react"
import { Formik, Form, ErrorMessage } from "formik"
import * as Yup from "yup"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAvatarStore } from "../../store/avatarStore"

const BCGProductSchema = Yup.object().shape({
  selectedProduct: Yup.string().required("Debe seleccionar un producto"),
})

interface BCGFormProps {
  onSubmit: (data: { selectedProduct: string }) => void
  onBack: () => void
}

export function BCGForm({ onSubmit, onBack }: BCGFormProps) {
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setBCGProductSession } = useAvatarStore()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log("[v0] Fetching available products...")
        const response = await fetch("/api/bcg/available-products")

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] Available products response:", data)

        setProducts(data.products || [])
      } catch (error) {
        console.error("[v0] Error fetching products:", error)
        setError(error instanceof Error ? error.message : "Error al cargar productos")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleSubmit = async (values: { selectedProduct: string }) => {
    try {
      console.log("[v0] BCG Form submitted with:", values)

      const conversationId = `bcg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const bcgSession = {
        sessionId: conversationId,
        conversationId,
        selectedProduct: values.selectedProduct,
        message: "Iniciando sesión BCG...", // Mensaje inicial por defecto
        formData: values,
        timestamp: Date.now(),
        generatedImages: [],
      }

      setBCGProductSession(bcgSession)
      console.log("[v0] BCG Session created:", bcgSession)

      onSubmit(values)
    } catch (error) {
      console.error("[v0] Error en formulario BCG:", error)
    }
  }

  if (loading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center">Cargando productos...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-2">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>BCG Product</CardTitle>
        <CardDescription>Seleccione el producto para el avatar BCG</CardDescription>
      </CardHeader>
      <CardContent>
        <Formik initialValues={{ selectedProduct: "" }} validationSchema={BCGProductSchema} onSubmit={handleSubmit}>
          {({ values, setFieldValue, isValid, isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Producto Seleccionado</label>
                <Select
                  value={values.selectedProduct}
                  onValueChange={(value) => setFieldValue("selectedProduct", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((productName) => (
                      <SelectItem key={productName} value={productName}>
                        {productName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorMessage name="selectedProduct" component="div" className="text-red-500 text-sm" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={onBack} variant="outline" className="flex-1 bg-transparent">
                  Volver
                </Button>
                <Button type="submit" disabled={!isValid || isSubmitting || products.length === 0} className="flex-1">
                  {isSubmitting ? "Procesando..." : "Continuar"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </CardContent>
    </Card>
  )
}

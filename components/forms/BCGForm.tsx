"use client"
import { useState, useEffect } from "react"
import { Formik, Form, ErrorMessage } from "formik"
import * as Yup from "yup"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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
        const response = await fetch("/api/bcg/available-products")
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
        const data = await response.json()
        setProducts(data.products || [])
      } catch (error) {
        setError(error instanceof Error ? error.message : "Error al cargar productos")
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const handleSubmit = async (values: { selectedProduct: string }) => {
    const conversationId = `bcg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const bcgSession = {
      sessionId: conversationId,
      conversationId,
      selectedProduct: values.selectedProduct,
      message: "",
      formData: values,
      timestamp: Date.now(),
      generatedImages: [],
    }
    setBCGProductSession(bcgSession)
    onSubmit(values)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-2xl mx-auto bg-card border-border shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-xl md:text-2xl text-foreground">Cargando productos disponibles...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-2xl mx-auto bg-card border-border shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-lg md:text-2xl text-destructive mb-6">Error: {error}</div>
            <Button onClick={() => window.location.reload()} size="lg">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
              Configuración BCG Product
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground">
              Selecciona el producto para personalizar tu análisis
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-card border-border shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="w-28 h-28 md:w-32 md:h-32 mx-auto mb-6">
              <div className="w-full h-full bg-primary/10 rounded-full border-4 border-primary flex items-center justify-center">
                <span className="text-2xl md:text-4xl font-bold text-primary">BCG</span>
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-foreground mb-2">BCG Product Analysis</CardTitle>
            <CardDescription className="text-lg md:text-xl text-muted-foreground">
              Análisis estratégico de productos con metodología BCG Matrix
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 md:px-12 pb-12">
            <Formik initialValues={{ selectedProduct: "" }} validationSchema={BCGProductSchema} onSubmit={handleSubmit}>
              {({ values, setFieldValue, isValid, isSubmitting }) => (
                <Form className="space-y-8">
                  {/* Select product */}
                  <div className="space-y-4">
                    <Label htmlFor="selectedProduct" className="text-lg md:text-xl font-semibold text-foreground">
                      Producto Seleccionado <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Select
                      value={values.selectedProduct}
                      onValueChange={(value) => setFieldValue("selectedProduct", value)}
                    >
                      <SelectTrigger className="h-14 md:h-16 text-base md:text-lg bg-background border-border">
                        <SelectValue placeholder="Seleccione un producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((productName) => (
                          <SelectItem key={productName} value={productName} className="text-base md:text-lg py-3">
                            {productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrorMessage name="selectedProduct" component="div" className="text-destructive text-base md:text-lg" />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-6 pt-6">
                    <Button
                      type="button"
                      onClick={onBack}
                      variant="outline"
                      size="lg"
                      className="flex-1 h-14 md:h-16 text-base md:text-lg bg-transparent border-2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isValid || isSubmitting || products.length === 0}
                      size="lg"
                      className="flex-1 h-14 md:h-16 text-base md:text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isSubmitting ? "Procesando..." : "Comenzar Análisis"}
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

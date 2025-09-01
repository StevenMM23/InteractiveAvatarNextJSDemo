"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { BCGProductSchema } from "../../schemas/validation"
import type { z } from "zod"

type BCGProductData = z.infer<typeof BCGProductSchema>

interface BCGFormProps {
  onSubmit: (data: BCGProductData) => void
  onBack: () => void
}

export function BCGForm({ onSubmit, onBack }: BCGFormProps) {
  const form = useForm<BCGProductData>({
    resolver: zodResolver(BCGProductSchema),
    mode: "onChange",
  })

  const handleSubmit = async (data: BCGProductData) => {
    try {
      const response = await fetch("/api/bcg-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Error al enviar datos del producto BCG")
      }

      const result = await response.json()
      console.log("[v0] BCG Product API response:", result)

      // Continuar con el flujo normal
      onSubmit(data)
    } catch (error) {
      console.error("[v0] Error en API BCG Product:", error)
      // Por ahora continuar con el flujo, pero podrías mostrar un error
      onSubmit(data)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>BCG Product</CardTitle>
        <CardDescription>Seleccione el producto para el avatar BCG</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="selectedProduct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto Seleccionado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="producto-a">Producto A</SelectItem>
                      <SelectItem value="producto-b">Producto B</SelectItem>
                      <SelectItem value="producto-c">Producto C</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" onClick={onBack} variant="outline" className="flex-1 bg-transparent">
                Volver
              </Button>
              <Button type="submit" disabled={!form.formState.isValid} className="flex-1">
                Continuar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

import { z } from "zod"

export const GestorCobranzaSchema = z.object({
    debtAmount: z
        .number()
        .positive("El monto debe ser mayor a 0")
        .max(999999999, "Monto demasiado alto")
        .multipleOf(0.01, "Solo se permiten hasta 2 decimales"),

    debtorName: z
        .string()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100, "El nombre no puede exceder 100 caracteres")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo se permiten letras y espacios"),

    discountPercentage: z
        .number()
        .min(0, "El descuento no puede ser negativo")
        .max(100, "El descuento no puede ser mayor a 100%")
        .multipleOf(0.01, "Solo se permiten hasta 2 decimales"),

    lateFee: z
        .number()
        .min(0, "La multa no puede ser negativa")
        .max(999999999, "Multa demasiado alta")
        .multipleOf(0.01, "Solo se permiten hasta 2 decimales"),
})

export const BCGProductSchema = z.object({
    selectedProduct: z.string().min(1, "Seleccione un producto"),
})




// Tipos TypeScript derivados de los esquemas
export type GestorCobranzaData = z.infer<typeof GestorCobranzaSchema>
export type BCGProductData = z.infer<typeof BCGProductSchema>

export const schemas = {
    "gestor-cobranza": GestorCobranzaSchema,

    "bcg-product": BCGProductSchema,
} as const

export type SchemaKey = keyof typeof schemas

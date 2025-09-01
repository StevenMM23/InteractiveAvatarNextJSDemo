import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log("[v0] API Route - Enviando datos a servidor externo:", body)

        const response = await fetch("https://44.203.3.232:8002/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })

        const responseText = await response.text()
        console.log("[v0] API Route - Respuesta cruda del servidor:", responseText)

        if (!response.ok) {
            console.error("[v0] API Route - Error del servidor externo:", response.status, response.statusText)
            return NextResponse.json(
                { error: `Error del servidor: ${response.status} ${response.statusText}. Respuesta: ${responseText}` },
                { status: response.status },
            )
        }

        try {
            const result = JSON.parse(responseText)
            console.log("[v0] API Route - Respuesta parseada del servidor externo:", result)
            return NextResponse.json(result)
        } catch (parseError) {
            console.error("[v0] API Route - Error parsing JSON:", parseError)
            console.error("[v0] API Route - Respuesta que causó el error:", responseText)
            return NextResponse.json(
                { error: "El servidor externo devolvió una respuesta inválida", rawResponse: responseText },
                { status: 502 },
            )
        }
    } catch (error) {
        console.error("[v0] API Route - Error:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        console.log("[v0] Chat API Route - Enviando mensaje:", body)

        const response = await fetch("https://44.203.3.232:8002/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        })

        const responseText = await response.text()
        console.log("[v0] Chat API Route - Respuesta cruda:", responseText)

        if (!response.ok) {
            console.error("[v0] Chat API Route - Error del servidor externo:", response.status, response.statusText)
            return NextResponse.json(
                { error: `Error del servidor: ${response.status} ${response.statusText}` },
                { status: response.status },
            )
        }

        try {
            const result = JSON.parse(responseText)
            console.log("[v0] Chat API Route - Respuesta parseada:", result)
            return NextResponse.json(result)
        } catch (parseError) {
            console.error("[v0] Chat API Route - Error parsing JSON:", parseError)
            return NextResponse.json(
                { error: "El servidor externo devolvió una respuesta inválida", rawResponse: responseText },
                { status: 502 },
            )
        }
    } catch (error) {
        console.error("[v0] Chat API Route - Error:", error)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}

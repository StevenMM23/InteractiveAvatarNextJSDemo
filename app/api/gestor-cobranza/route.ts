import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] API Route - Enviando datos a servidor externo:", body)

    const response = await fetch("http://44.203.3.232:8002/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error("[v0] API Route - Error del servidor externo:", response.status, response.statusText)
      return NextResponse.json(
        { error: `Error del servidor: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    const result = await response.json()
    console.log("[v0] API Route - Respuesta del servidor externo:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] API Route - Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

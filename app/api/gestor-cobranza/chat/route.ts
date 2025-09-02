import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Gestor Cobranza Chat - Request body:", body)

    const response = await fetch("http://44.203.3.232:8002/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text()
    console.log("[v0] Gestor Cobranza Chat - Raw response:", responseText)
    console.log("[v0] Gestor Cobranza Chat - Response status:", response.status)

    if (!response.ok) {
      console.error("[v0] Gestor Cobranza Chat - External server error:", response.status, response.statusText)
      return NextResponse.json(
        { error: `Server error: ${response.status} ${response.statusText}. Response: ${responseText}` },
        { status: response.status },
      )
    }

    try {
      const result = JSON.parse(responseText)
      console.log("[v0] Gestor Cobranza Chat - Parsed response:", result)
      return NextResponse.json(result)
    } catch (parseError) {
      console.error("[v0] Gestor Cobranza Chat - JSON parse error:", parseError)
      console.error("[v0] Gestor Cobranza Chat - Response that caused error:", responseText.substring(0, 200))
      return NextResponse.json(
        { error: "External server returned invalid response", rawResponse: responseText.substring(0, 200) },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error("[v0] Gestor Cobranza Chat - Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

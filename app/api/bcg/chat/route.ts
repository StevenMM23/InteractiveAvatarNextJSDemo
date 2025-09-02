import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[v0] BCG Chat Request Body:", body);

    const response = await fetch("http://44.203.3.232:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[v0] BCG Chat API Error:", response.status, errorText);
      return NextResponse.json(
        { error: `API Error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[v0] BCG Chat API Response:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Error in BCG chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}

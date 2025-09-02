import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[v0] Fetching available products from BCG API");

    const response = await fetch("http://44.203.3.232:8000/available-products", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[v0] BCG API Error:", response.status, errorText);
      return NextResponse.json(
        { error: `API Error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[v0] BCG Available Products Response:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Error fetching available products:", error);
    return NextResponse.json(
      { error: "Failed to fetch available products" },
      { status: 500 }
    );
  }
}

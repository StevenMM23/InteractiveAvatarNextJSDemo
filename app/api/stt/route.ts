import { NextResponse } from "next/server";
import { v2 as speech } from "@google-cloud/speech";

// Inicializamos cliente de Google
const client = new speech.SpeechClient();

export async function POST(req: Request) {
    try {
        // 1) Recibir el audio del body
        const formData = await req.formData();
        const file = formData.get("audio") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No se envió archivo de audio" }, { status: 400 });
        }

        // Convertir a Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Llamar a Google STT
        const [response] = await client.recognize({
            recognizer: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/global/recognizers/_`,
            config: {
                autoDecodingConfig: {},         // autodetecta formato (wav, flac, webm opus, etc.)
                languageCodes: ["es-ES"],       // idioma (puedes cambiar a "en-US", etc.)
                model: "latest_short",          // para frases cortas
                features: { enableAutomaticPunctuation: true },
            },
            content: buffer.toString("base64"),
        } as any);

        // 3) Tomar transcript
        const transcript =
            response?.results?.[0]?.alternatives?.[0]?.transcript || "";

        return NextResponse.json({ transcript });
    } catch (error: any) {
        console.error("[STT] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

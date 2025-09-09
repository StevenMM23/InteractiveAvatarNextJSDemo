// quick-test.ts
import { v2 as speech } from "@google-cloud/speech";

/** Crea un WAV PCM 16-bit mono 16kHz con 0.5s de silencio */
function makeSilenceWav(durationMs = 500, sampleRate = 16000): Buffer {
  const numSamples = Math.floor((durationMs / 1000) * sampleRate);
  const bytesPerSample = 2; // PCM 16-bit
  const dataSize = numSamples * bytesPerSample;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0); // ChunkID
  buffer.writeUInt32LE(36 + dataSize, 4); // ChunkSize = 36 + Subchunk2Size
  buffer.write("WAVE", 8); // Format

  // fmt subchunk
  buffer.write("fmt ", 12); // Subchunk1ID
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  const byteRate = sampleRate * 1 * bytesPerSample;
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(1 * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(8 * bytesPerSample, 34); // BitsPerSample (16)

  // data subchunk
  buffer.write("data", 36); // Subchunk2ID
  buffer.writeUInt32LE(dataSize, 40); // Subchunk2Size

  // Datos = silencio (ya viene en 0 por defecto)
  return buffer;
}

async function main() {
  // 1) Instanciar cliente (usa GOOGLE_APPLICATION_CREDENTIALS automáticamente)
  const client = new speech.SpeechClient();

  // 2) Construir un WAV de silencio corto
  const wav = makeSilenceWav(600); // 0.6s

  // 3) Llamar a Recognize v2 con autodetección de formato
  const recognizer = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/global/recognizers/_`;

  const request: any = {
    recognizer,
    config: {
      autoDecodingConfig: {},           // autodetecta WAV/FLAC/OPUS/etc.
      languageCodes: ["es-ES"],         // puedes cambiar si quieres
      model: "latest_short",
      features: { enableAutomaticPunctuation: true },
    },
    content: wav,                        // bytes del WAV generado
  };

  console.log("[SmokeTest] Enviando recognize()…");
  const [response] = await client.recognize(request);
  const text =
    response?.results?.[0]?.alternatives?.[0]?.transcript || "(sin transcript, esperado por silencio)";
  console.log("[SmokeTest] OK. API respondió. Transcript:", text);
}

main().catch((e) => {
  console.error("[SmokeTest] ERROR:", e);
  process.exit(1);
});

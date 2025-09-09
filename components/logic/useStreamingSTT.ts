"use client"

import { useEffect, useRef, useState } from "react"

export function useStreamingSTT(wsUrl: string) {
    const wsRef = useRef<WebSocket | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [finalTranscript, setFinalTranscript] = useState("")

    // 🔗 Conectar al WebSocket
    useEffect(() => {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
            console.log("[STT] 🔗 Conectado al servidor WS")
            setIsConnected(true)
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.error) {
                    console.error("[STT] ❌ Error:", data.error)
                    return
                }
                if (data.transcript) {
                    if (data.isFinal) {
                        console.log("[STT] ✅ Final:", data.transcript)
                        setFinalTranscript(data.transcript)
                    } else {
                        console.log("[STT] ✍️ Parcial:", data.transcript)
                        setTranscript(data.transcript)
                    }
                }
            } catch (err) {
                console.error("[STT] ⚠️ Error parseando mensaje:", err)
            }
        }

        ws.onclose = () => {
            console.log("[STT] ❌ Conexión cerrada")
            setIsConnected(false)
        }

        ws.onerror = (err) => {
            console.error("[STT] ⚠️ Error en WS:", err)
        }

        return () => {
            ws.close()
        }
    }, [wsUrl])

    // 🎤 Iniciar grabación
    const startRecording = async () => {
        if (!isConnected) {
            console.warn("[STT] WebSocket no conectado")
            return
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
        recorderRef.current = recorder

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(e.data) // enviar chunk al backend
            }
        }

        recorder.start(250) // cada 250ms un chunk
        setIsRecording(true)
        console.log("[STT] 🎤 Grabación iniciada")
    }

    // ⏹️ Detener grabación
    const stopRecording = () => {
        recorderRef.current?.stop()
        recorderRef.current = null
        setIsRecording(false)
        console.log("[STT] ⏹️ Grabación detenida")
    }

    return {
        isConnected,
        isRecording,
        transcript,
        finalTranscript,
        startRecording,
        stopRecording,
    }
}

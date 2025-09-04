"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useMessageHistory, MessageSender } from "../logic"
import { TextInput } from "./TextInput"
import { useAvatarStore } from "@/store/avatarStore"
import { ImageModal } from "../ImageModal"
import { useEffect, useRef } from "react"

interface ChatSidebarProps {
    isOpen: boolean
    onToggle: () => void
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
    const { messages } = useMessageHistory()
    const {
        currentAvatarType,
        generatedImages,
        isImageModalOpen,
        setImageModalOpen,
        selectedImage,
        setSelectedImage,
        addBCGImage,
    } = useAvatarStore()

    const isBCG = currentAvatarType === "bcg-product"

    // sentinel para autoscroll
    const endRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end" })
    }, [messages, isOpen])

    return (
        <div
            className={`fixed right-0 top-0 h-full w-[clamp(28rem,35vw,40rem)] bg-card border-l border-border shadow-2xl z-50
      transform transition-transform duration-300 ease-in-out 
      ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        >
            {/* Header fijo (64px) */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border relative">
                <h3 className="font-semibold text-2xl text-foreground">
                    {isBCG ? "BCG Assistant" : "Chat"}
                </h3>
                <Button variant="ghost" size="icon" onClick={onToggle} className="absolute right-4">
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* ⚠️ Contenedor limpio: ocupa todo lo demás del alto */}
            <div className="flex flex-col h-[calc(100%-64px)] overflow-hidden">
                {isBCG ? (
                    <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                        {/* Tabs no crecen, no empujan */}
                        <TabsList className="h-10 shrink-0 w-full border-b border-border rounded-none">
                            <TabsTrigger value="chat" className="text-base font-semibold">Chat</TabsTrigger>
                            <TabsTrigger value="images" className="text-base font-semibold">Imágenes</TabsTrigger>
                        </TabsList>

                        {/* CHAT: sin márgenes extra, ocupa todo */}
                        <TabsContent
                            value="chat"
                            className="flex-1 overflow-hidden p-0 data-[state=inactive]:hidden"
                        >
                            <ScrollArea className="h-full">
                                <div className="px-4 pt-3 pb-28 space-y-5">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.sender === MessageSender.CLIENT ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg px-5 py-3 text-xl shadow-md ${msg.sender === MessageSender.CLIENT
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-secondary text-secondary-foreground"
                                                    }`}
                                            >
                                                <p>{msg.content}</p>
                                                {msg.imageBase64 && (
                                                    <div className="mt-3">
                                                        <img
                                                            src={`data:image/png;base64,${msg.imageBase64}`}
                                                            alt="Imagen generada"
                                                            className="rounded-lg shadow-md max-h-[250px] cursor-pointer transition-transform hover:scale-105"
                                                            onClick={() => addBCGImage(msg.imageBase64!)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={endRef} />
                                </div>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>
                        </TabsContent>

                        {/* IMÁGENES: lista vertical scrollable */}
                        <TabsContent
                            value="images"
                            className="flex-1 overflow-hidden p-0 data-[state=inactive]:hidden"
                        >
                            <ScrollArea className="h-full">
                                <div className="px-4 pt-3 pb-28 flex flex-col gap-6">
                                    {generatedImages.length ? (
                                        generatedImages.map((img, i) => (
                                            <div
                                                key={i}
                                                className="cursor-pointer overflow-hidden rounded-lg border border-border shadow hover:shadow-lg transition"
                                                onClick={() => { setSelectedImage(img); setImageModalOpen(true); }}
                                            >
                                                <img src={`data:image/png;base64,${img}`} alt={`Generated ${i}`} className="w-full h-auto object-contain" />
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-lg text-muted-foreground">No hay imágenes generadas aún.</p>
                                    )}
                                    <div ref={endRef} />
                                </div>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                ) : (
                    // Otros avatares: solo chat
                    <ScrollArea className="h-full">
                        <div className="px-4 pt-3 pb-28 space-y-5">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === MessageSender.CLIENT ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-5 py-3 text-xl shadow-md ${msg.sender === MessageSender.CLIENT
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary text-secondary-foreground"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>
                )}

                {/* Input fijo abajo (no empuja el scroll) */}
                <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card p-4">
                    {currentAvatarType ? <TextInput avatarType={currentAvatarType} /> : <p className="text-lg text-muted-foreground">Selecciona un avatar para empezar a chatear</p>}
                </div>
            </div>

            {/* Modal */}
            {isImageModalOpen && selectedImage && <ImageModal imageBase64={selectedImage} title="Imagen generada" />}
        </div>
    )
}

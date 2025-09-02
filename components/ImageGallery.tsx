"use client"

import { useAvatarStore } from "../store/avatarStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"

interface ImageGalleryProps {
    avatarType: string
    onImageClick: (imageBase64: string) => void
}

export function ImageGallery({ avatarType, onImageClick }: ImageGalleryProps) {
    const { getSession } = useAvatarStore()
    const session = getSession(avatarType)

    const images: string[] = session && "generatedImages" in session ? (session as any).generatedImages || [] : []

    if (images.length === 0) {
        return (
            <Card className="w-64 h-full">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Galería de Imágenes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No hay imágenes generadas aún</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-64 h-full overflow-auto">
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Galería ({images.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {images.map((image: string, index: number) => (
                    <Button
                        key={index}
                        variant="outline"
                        className="w-full h-20 p-1 bg-transparent"
                        onClick={() => onImageClick(image)}
                    >
                        <img
                            src={`data:image/png;base64,${image}`}
                            alt={`Imagen ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                        />
                    </Button>
                ))}
            </CardContent>
        </Card>
    )
}

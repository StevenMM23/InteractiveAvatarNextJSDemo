"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAvatarStore } from "@/store/avatarStore"

interface ImageModalProps {
  imageBase64: string
  title?: string
}

export function ImageModal({ imageBase64, title = "" }: ImageModalProps) {
  const { isImageModalOpen, setImageModalOpen } = useAvatarStore()

  return (
    <Dialog open={isImageModalOpen} onOpenChange={(open) => setImageModalOpen(open)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

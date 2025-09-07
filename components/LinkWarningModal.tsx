import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface LinkWarningModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  onConfirm: (trust: boolean) => void
}

export function LinkWarningModal({ isOpen, onClose, url, onConfirm }: LinkWarningModalProps) {
  const [trustSite, setTrustSite] = useState(false)

  const handleConfirm = () => {
    onConfirm(trustSite)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="bg-[#18191c] border-none p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#faa81a]/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-[#faa81a]" />
              </div>
              <h3 className="text-white font-semibold mb-2 text-lg">Внешняя ссылка</h3>
              <p className="text-[#B9BBBE] text-sm mb-2">Вы собираетесь посетить:</p>
              <div className="w-full bg-[#2f3136] text-white p-2 rounded-md mb-4 overflow-hidden">
                <p className="truncate">{url.length > 50 ? `${url.substring(0, 50)}...` : url}</p>
              </div>
              <p className="text-[#B9BBBE] text-sm mb-6">Убедитесь, что вы доверяете этому сайту.</p>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="trust-site"
                  checked={trustSite}
                  onCheckedChange={(checked) => setTrustSite(checked as boolean)}
                />
                <label
                  htmlFor="trust-site"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white"
                >
                  Доверять этому сайту
                </label>
              </div>
              <div className="flex gap-3 w-full">
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium"
                >
                  Посетить
                </Button>
                <Button onClick={onClose} className="flex-1 bg-[#4E5058] hover:bg-[#6D6F78] text-white font-medium">
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}

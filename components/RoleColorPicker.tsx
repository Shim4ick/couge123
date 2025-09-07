"use client"

import type React from "react"
import { Palette, X } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { HexColorPicker, HexColorInput } from "react-colorful"
import { Button } from "@/components/ui/button"

interface RoleColorPickerProps {
  color: string
  gradientColor?: string | null
  onChange: (color: string, gradientColor?: string | null) => void
  label?: string
}

const RoleColorPicker: React.FC<RoleColorPickerProps> = ({ color, gradientColor, onChange, label }) => {
  const [selectedColor, setSelectedColor] = useState(color || "#99AAB5")
  const [selectedGradientColor, setSelectedGradientColor] = useState(gradientColor || null)
  const [activeColorPicker, setActiveColorPicker] = useState<"primary" | "secondary" | null>(null)

  useEffect(() => {
    setSelectedColor(color || "#99AAB5")
    setSelectedGradientColor(gradientColor || null)
  }, [color, gradientColor])

  const handleColorChange = (newColor: string) => {
    if (activeColorPicker === "primary") {
      setSelectedColor(newColor)
      onChange(newColor, selectedGradientColor)
    } else if (activeColorPicker === "secondary") {
      setSelectedGradientColor(newColor)
      onChange(selectedColor, newColor)
    }
  }

  const addSecondaryColor = () => {
    const defaultSecondaryColor = "#5865F2"
    setSelectedGradientColor(defaultSecondaryColor)
    onChange(selectedColor, defaultSecondaryColor)
  }

  const removeSecondaryColor = () => {
    setSelectedGradientColor(null)
    onChange(selectedColor, null)
  }

  const getDisplayStyle = () => {
    if (selectedGradientColor) {
      return {
        background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedGradientColor} 100%)`,
      }
    }
    return {
      backgroundColor: selectedColor,
    }
  }

  // Discord-like role colors
  const presetColors = [
    "#99AAB5", // Default
    "#1ABC9C", // Aqua
    "#2ECC71", // Green
    "#3498DB", // Blue
    "#9B59B6", // Purple
    "#E91E63", // Magenta
    "#F1C40F", // Yellow
    "#E67E22", // Orange
    "#E74C3C", // Red
    "#95A5A6", // Light Grey
    "#607D8B", // Dark Grey
    "#11806A", // Dark Aqua
    "#1F8B4C", // Dark Green
    "#206694", // Dark Blue
    "#71368A", // Dark Purple
    "#AD1457", // Dark Magenta
    "#C27C0E", // Dark Yellow
    "#A84300", // Dark Orange
    "#992D22", // Dark Red
  ]

  return (
    <div className="space-y-4">
      {label && <span className="text-xs text-white/60 block">{label}</span>}

      {/* Color Selection Buttons */}
      <div className="flex items-center gap-3">
        <Popover
          open={activeColorPicker === "primary"}
          onOpenChange={(open) => setActiveColorPicker(open ? "primary" : null)}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-20 h-10 p-0 border-2 border-white/20 hover:border-white/40 transition-colors"
              style={{ backgroundColor: selectedColor }}
            >
              <span className="sr-only">Primary color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 bg-[#2f3136] border-none shadow-xl">
            <div className="space-y-3">
              <div className="text-white text-sm font-medium">Primary Color</div>
              <HexColorPicker color={selectedColor} onChange={handleColorChange} />
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">#</span>
                <HexColorInput
                  color={selectedColor}
                  onChange={handleColorChange}
                  prefixed={false}
                  className="bg-[#1e1f22] border-none text-white p-2 text-sm w-full rounded"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform"
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handleColorChange(presetColor)}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {selectedGradientColor ? (
          <>
            <Popover
              open={activeColorPicker === "secondary"}
              onOpenChange={(open) => setActiveColorPicker(open ? "secondary" : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-20 h-10 p-0 border-2 border-white/20 hover:border-white/40 transition-colors"
                  style={{ backgroundColor: selectedGradientColor }}
                >
                  <span className="sr-only">Secondary color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 bg-[#2f3136] border-none shadow-xl">
                <div className="space-y-3">
                  <div className="text-white text-sm font-medium">Secondary Color</div>
                  <HexColorPicker color={selectedGradientColor} onChange={handleColorChange} />
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">#</span>
                    <HexColorInput
                      color={selectedGradientColor}
                      onChange={handleColorChange}
                      prefixed={false}
                      className="bg-[#1e1f22] border-none text-white p-2 text-sm w-full rounded"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {presetColors.map((presetColor) => (
                      <button
                        key={presetColor}
                        className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform"
                        style={{ backgroundColor: presetColor }}
                        onClick={() => handleColorChange(presetColor)}
                      />
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeSecondaryColor}
              className="text-white/60 hover:text-white hover:bg-red-500/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={addSecondaryColor}
            className="border-2 border-dashed border-white/30 hover:border-white/50 text-white/60 hover:text-white bg-transparent hover:bg-white/5"
          >
            <Palette className="w-4 h-4 mr-2" />
            Add gradient
          </Button>
        )}
      </div>

      {/* Color Values Display */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Primary:</span>
          <span className="text-white font-mono">{selectedColor}</span>
        </div>
        {selectedGradientColor && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/60">Secondary:</span>
            <span className="text-white font-mono">{selectedGradientColor}</span>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <div className="text-white/60 text-sm">Preview:</div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/10" style={getDisplayStyle()} />
          <div
            className="text-lg font-medium"
            style={
              selectedGradientColor
                ? {
                    background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedGradientColor} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    display: "inline-block",
                  }
                : { color: selectedColor }
            }
          >
            Username
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleColorPicker

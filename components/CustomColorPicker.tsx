"use client"

import type React from "react"
import { Pencil } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useState, useEffect, useRef } from "react"

interface CustomColorPickerProps {
  color: string | null
  onChange: (color: string | null) => void
  label: string
}

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ color, onChange, label }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative w-48 h-24 rounded-lg cursor-pointer overflow-hidden group">
          <div
            className={`absolute inset-0 ${color ? "" : "border border-gray-600/30"}`}
            style={{ backgroundColor: color || "#2f3136" }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200" />
          <Pencil className="absolute top-2 right-2 w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
            {color || "Not set"}
          </div>
          <div className="absolute top-2 left-2 text-xs text-white font-semibold">{label}</div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-[#2f3136] border-none shadow-xl">
        <DiscordStyleColorPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}

// Custom Discord-style color picker
const DiscordStyleColorPicker: React.FC<{ color: string | null; onChange: (color: string | null) => void }> = ({
  color,
  onChange,
}) => {
  // Default to red (hue 0) with full saturation and brightness
  const [hue, setHue] = useState<number>(0)
  const [saturation, setSaturation] = useState<number>(100)
  const [brightness, setBrightness] = useState<number>(100)
  const [hexValue, setHexValue] = useState<string>(color || "")
  const [hasSelector, setHasSelector] = useState<boolean>(!!color)
  const colorFieldRef = useRef<HTMLDivElement>(null)
  const hueSliderRef = useRef<HTMLDivElement>(null)
  const isUpdatingFromMainField = useRef<boolean>(false)

  // Convert HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    s = s / 100
    v = v / 100

    let r = 0,
      g = 0,
      b = 0

    const i = Math.floor(h / 60)
    const f = h / 60 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)

    switch (i % 6) {
      case 0:
        r = v
        g = t
        b = p
        break
      case 1:
        r = q
        g = v
        b = p
        break
      case 2:
        r = p
        g = v
        b = t
        break
      case 3:
        r = p
        g = q
        b = v
        break
      case 4:
        r = t
        g = p
        b = v
        break
      case 5:
        r = v
        g = p
        b = q
        break
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    }
  }

  // Convert RGB to Hex
  const rgbToHex = (r: number, g: number, b: number) => {
    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16)
          return hex.length === 1 ? "0" + hex : hex
        })
        .join("")
    )
  }

  // Convert Hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  // Convert RGB to HSV
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    const d = max - min
    const s = max === 0 ? 0 : d / max
    const v = max

    if (max === min) {
      h = 0
    } else {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h *= 60
    }

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    }
  }

  // Initialize HSV values from color prop
  useEffect(() => {
    if (color) {
      const rgb = hexToRgb(color)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      setHue(hsv.h)
      setSaturation(hsv.s)
      setBrightness(hsv.v)
      setHexValue(color)
      setHasSelector(true)
    } else {
      // Default to red with full saturation and brightness when no color is selected
      setHue(0)
      setSaturation(100)
      setBrightness(100)
      setHexValue("")
      setHasSelector(false)
    }
  }, [color])

  // Handle hex input change
  const handleHexChange = (value: string) => {
    // Remove # if present
    let hexColor = value.replace("#", "")

    // Filter out non-hex characters
    hexColor = hexColor.replace(/[^0-9A-Fa-f]/g, "")

    // Limit to 6 characters
    hexColor = hexColor.substring(0, 6)

    // Update the input value
    setHexValue(hexColor.length > 0 ? `#${hexColor}` : "")

    // Only update color if we have a valid hex
    if (hexColor.length === 6) {
      const fullHex = `#${hexColor}`

      const rgb = hexToRgb(fullHex)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)

      // Update state
      setHue(hsv.h)
      setSaturation(hsv.s)
      setBrightness(hsv.v)
      setHasSelector(true)

      // Notify parent
      onChange(fullHex)
    }
  }

  // Handle hue slider change
  const handleHueChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hueSliderRef.current) return

    const rect = hueSliderRef.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    // Calculate new hue
    const newHue = Math.round(y * 360)
    setHue(newHue)

    // If we already have a color selected, update it
    if (hasSelector) {
      const rgb = hsvToRgb(newHue, saturation, brightness)
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
      setHexValue(hex)
      onChange(hex)
    }
  }

  // Handle saturation/brightness change from color field
  const handleSatBrightChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!colorFieldRef.current) return

    // Set flag to prevent hue updates
    isUpdatingFromMainField.current = true

    const rect = colorFieldRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    // Calculate new saturation and brightness
    const newSaturation = Math.round(x * 100)
    const newBrightness = Math.round((1 - y) * 100)

    // Update state
    setSaturation(newSaturation)
    setBrightness(newBrightness)
    setHasSelector(true)

    // Calculate new color
    const rgb = hsvToRgb(hue, newSaturation, newBrightness)
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
    setHexValue(hex)

    // Notify parent
    onChange(hex)

    // Reset flag
    setTimeout(() => {
      isUpdatingFromMainField.current = false
    }, 0)
  }

  // Get background color for the saturation/brightness picker
  const getHueColor = () => {
    const rgb = hsvToRgb(hue, 100, 100)
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {/* Main color picker area */}
        <div
          ref={colorFieldRef}
          className="relative w-full h-[180px] rounded-md overflow-hidden cursor-crosshair"
          onClick={handleSatBrightChange}
          onMouseDown={handleSatBrightChange}
          onMouseMove={(e) => e.buttons === 1 && handleSatBrightChange(e)}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, white, ${getHueColor()})`,
              backgroundSize: "100% 100%",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, black, transparent)",
              backgroundSize: "100% 100%",
            }}
          />
          {hasSelector && (
            <div
              className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none"
              style={{
                left: `${saturation}%`,
                top: `${100 - brightness}%`,
                boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </div>

        {/* Vertical hue slider */}
        <div
          ref={hueSliderRef}
          className="relative w-8 h-[180px] rounded-md overflow-hidden cursor-pointer"
          onClick={handleHueChange}
          onMouseDown={handleHueChange}
          onMouseMove={(e) => e.buttons === 1 && handleHueChange(e)}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              backgroundSize: "100% 100%",
            }}
          />
          <div
            className="absolute w-3 h-3 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none"
            style={{
              top: `${(hue / 360) * 100}%`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>

      {/* Hex input */}
      <div className="relative mt-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/70">#</div>
        <input
          type="text"
          value={hexValue.replace("#", "")}
          onChange={(e) => handleHexChange(`#${e.target.value}`)}
          maxLength={6}
          placeholder=""
          className="w-full bg-[#1e1f22] border-none text-white p-2 pl-7 rounded-md text-sm focus:ring-1 focus:ring-[#5865F2] focus:outline-none"
        />
      </div>
    </div>
  )
}

export default CustomColorPicker

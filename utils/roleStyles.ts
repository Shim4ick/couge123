import type React from "react"
interface Role {
  color: string
  gradient_color?: string | null
}

export const getRoleDisplayStyle = (role: Role): React.CSSProperties => {
  if (role.gradient_color) {
    return {
      background: `linear-gradient(135deg, ${role.color} 0%, ${role.gradient_color} 100%)`,
    }
  }
  return {
    backgroundColor: role.color,
  }
}

export const getRoleTextStyle = (role: Role): React.CSSProperties => {
  if (role.gradient_color) {
    return {
      background: `linear-gradient(135deg, ${role.color} 0%, ${role.gradient_color} 100%)`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      display: "inline-block",
    }
  }
  return {
    color: role.color,
  }
}

export const getRolePreviewText = (color: string, gradientColor?: string | null): string => {
  if (gradientColor) {
    return `${color} → ${gradientColor}`
  }
  return color
}

export const getRoleColorForDisplay = (role: Role): string => {
  if (role.gradient_color) {
    return `linear-gradient(135deg, ${role.color} 0%, ${role.gradient_color} 100%)`
  }
  return role.color
}

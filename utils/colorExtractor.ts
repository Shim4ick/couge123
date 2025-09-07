export async function extractColors(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw image to canvas
      ctx.drawImage(img, 0, 0)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

      // Sample colors from different parts of the image
      const colors: { [key: string]: number } = {}

      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i]
        const g = imageData[i + 1]
        const b = imageData[i + 2]

        // Skip fully transparent pixels
        if (imageData[i + 3] === 0) continue

        // Convert to hex
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
        colors[hex] = (colors[hex] || 0) + 1
      }

      // Sort colors by frequency and get top 2
      const sortedColors = Object.entries(colors)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([color]) => color)

      resolve(sortedColors)
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = imageUrl
  })
}

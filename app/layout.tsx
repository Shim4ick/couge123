import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@/components/providers/UserProvider"
import { BetaWelcomeModal } from "@/components/BetaWelcomeModal"
import { ConnectionStatusWrapper } from "@/components/ConnectionStatusWrapper"
import { BetaBanner } from "@/components/BetaBanner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Couge",
  description: "A modern social platform for seamless communication and interaction.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://couge.app"),
  openGraph: {
    title: "Couge",
    description: "A modern social platform for seamless communication and interaction.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Couge",
    description: "A modern social platform for seamless communication and interaction.",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full overflow-hidden`}>
      <UserProvider>
        <body className="font-sans h-full overflow-hidden m-0 p-0">
          <div className="h-screen flex flex-col">
            <BetaBanner />
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
          </div>
          <BetaWelcomeModal />
          <ConnectionStatusWrapper />
        </body>
      </UserProvider>
    </html>
  )
}

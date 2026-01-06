import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { UserProvider } from "@/components/providers/UserProvider"
import { BetaWelcomeModal } from "@/components/BetaWelcomeModal"
import { ConnectionStatusWrapper } from "@/components/ConnectionStatusWrapper"
import { Providers } from "@/components/providers/Providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Couge",
  description: "A modern social platform for seamless communication and interaction.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <Providers>
        <UserProvider>
          <body className={`${inter.className} h-full overflow-hidden m-0 p-0`}>
            <div className="h-screen flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
            </div>
            <BetaWelcomeModal />
            <ConnectionStatusWrapper />
          </body>
        </UserProvider>
      </Providers>
    </html>
  )
}

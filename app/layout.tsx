import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { Fira_Mono as FontMono, Mona_Sans as FontSans } from "next/font/google"


const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})


export const metadata: Metadata = {
  title: {
    default: "HeyGen Interactive Avatar SDK Demo",
    template: `%s - HeyGen Interactive Avatar SDK Demo`,
  },
  icons: {
    icon: "/heygen-logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning className={`${fontSans.variable} font-sans`} lang="en">
      <head />
      <body className="min-h-screen bg-black text-white" suppressHydrationWarning>
        <main className="relative flex flex-col gap-6 h-screen w-screen">

          {children}
        </main>
      </body>
    </html>
  )
}

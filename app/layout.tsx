import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { Fira_Mono as FontMono, Mona_Sans as FontSans } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { ThemeToggle } from "@/components/ThemeToggle"

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
    <html suppressHydrationWarning lang="en" className={`${fontSans.variable} font-sans`}>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"         // añade/remueve "dark" en <html>
          defaultTheme="dark"     // light/dark según sistema
          enableSystem              // se adapta al sistema operativo
          disableTransitionOnChange // evita flash feo al cambiar
        >
          <main className="relative flex flex-col h-screen w-screen bg-background text-foreground">
            <ThemeToggle />
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}

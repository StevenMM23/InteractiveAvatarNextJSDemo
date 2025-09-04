import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { Mona_Sans as FontSans } from "next/font/google"
import { ThemeProvider } from "next-themes"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "GBM-IA Interactive Avatar",
    template: `%s - GBM-IA Interactive Avatar`,
  },
  description: "Plataforma de interacción con avatares inteligentes impulsados por IA de GBM.",
  icons: {
    icon: "/gbm_logo_azul.png",
  }
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
            {/* <ThemeToggle /> */}
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}

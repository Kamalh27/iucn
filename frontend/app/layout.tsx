import type { Metadata } from "next"
import "./globals.css"
import { LanguageProvider } from "@/components/i18n/language-provider"

export const metadata: Metadata = {
  title: "CRVA | Climate Risk and Vulnerability Assessment",
  description: "CRVA mapping and administration portal",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  )
}

import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "NBS | Nature Based Solutions",
  description: "Nature Based Solutions mapping and admin interface",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

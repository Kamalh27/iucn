"use client"

import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

import { Switch } from "@/components/ui/switch"

const THEME_KEY = "crva-theme"

type Theme = "light" | "dark"

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light"
  }

  const saved = localStorage.getItem(THEME_KEY)
  if (saved === "light" || saved === "dark") {
    return saved
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  localStorage.setItem(THEME_KEY, theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const isDark = theme === "dark"

  return (
    <div className="flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      <Switch
        aria-label="Toggle dark mode"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
      <Moon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
    </div>
  )
}

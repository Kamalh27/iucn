"use client"

import { useEffect, useState } from "react"

import { getCurrentUser } from "@/features/auth/api"
import type { AuthUser } from "@/features/auth/types"

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void getCurrentUser().then((result) => {
      if (!mounted) return
      setUser(result)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  return { user, loading }
}

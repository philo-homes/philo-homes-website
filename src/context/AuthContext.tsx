'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Customer, getMe, getToken, login as apiLogin, register as apiRegister, setToken } from '@/lib/medusa'

type AuthState = {
  customer: Customer | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: { email: string; password: string; first_name?: string; last_name?: string }) => Promise<void>
  signOut: () => void
  refresh: () => Promise<Customer | null>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [token, setTok] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const t = getToken()
    setTok(t)
    if (!t) {
      setCustomer(null)
      return null
    }
    try {
      const me = await getMe(t)
      setCustomer(me)
      // Wake the design services in the background so My Designs is quick.
      fetch('/api/designs/warm', { cache: 'no-store' }).catch(() => {})
      return me
    } catch (e: any) {
      if (e?.status === 401) {
        setToken(null)
        setTok(null)
      }
      setCustomer(null)
      return null
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const t = await apiLogin(email, password)
    setToken(t)
    await refresh()
  }, [refresh])

  const signUp = useCallback(async (input: { email: string; password: string; first_name?: string; last_name?: string }) => {
    const t = await apiRegister(input)
    setToken(t)
    await refresh()
  }, [refresh])

  const signOut = useCallback(() => {
    setToken(null)
    setTok(null)
    setCustomer(null)
  }, [])

  const value = useMemo(() => ({ customer, token, loading, signIn, signUp, signOut, refresh }), [customer, token, loading, signIn, signUp, signOut, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

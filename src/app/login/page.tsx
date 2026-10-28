'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Shell from '@/components/Shell'
import { Button, Field } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'

function LoginInner() {
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const next = useSearchParams().get('next') || '/designs'
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email, password)
      else await signUp({ email, password, first_name: first, last_name: last })
      router.push(next)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl text-center" style={{ fontFamily: "'Henry Trial', serif" }}>{mode === 'in' ? 'Sign in' : 'Create account'}</h1>
      <p className="text-center text-sm text-[#4B4B4B] mt-2">Same account as the Philo Homes app — your designs, cart and favorites follow you.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === 'up' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
            <Field label="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
          </div>
        )}
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</Button>
      </form>
      <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="block mx-auto mt-4 text-sm text-[#4B4B4B] underline">
        {mode === 'in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Shell>
      <Suspense><LoginInner /></Suspense>
    </Shell>
  )
}

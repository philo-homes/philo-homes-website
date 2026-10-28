'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Shell from '@/components/Shell'
import { Button, Field } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'
import { getPhoneStatus, listOrders, PhoneStatus, requestPhoneCode, updateMe, verifyPhoneCode } from '@/lib/medusa'
import { formatDate, formatPrice } from '@/lib/format'

export default function AccountPage() {
  const { customer, loading, signOut, refresh } = useAuth()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [saved, setSaved] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null>(null)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [phoneMsg, setPhoneMsg] = useState('')

  useEffect(() => {
    if (!customer) return
    setFirst(customer.first_name ?? '')
    setLast(customer.last_name ?? '')
    setPhone(customer.phone ?? '')
    listOrders().then(setOrders).catch(() => setOrders([]))
    getPhoneStatus().then(setPhoneStatus).catch(() => setPhoneStatus(null))
  }, [customer])

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) return <Shell><p className="text-sm"><Link href="/login?next=/account" className="underline">Sign in</Link> to see your account.</p></Shell>

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateMe({ first_name: first, last_name: last })
    await refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sendCode = async () => {
    setPhoneMsg('')
    try {
      const r = await requestPhoneCode(phone)
      if (r.already_verified) {
        setPhoneMsg('This number is already verified.')
        setPhoneStatus(await getPhoneStatus())
        return
      }
      setSentTo(r.phone_masked)
      if (r.dev_code) setCode(r.dev_code)
    } catch (err: any) {
      setPhoneMsg(err?.message || 'Could not send the code.')
    }
  }
  const verify = async () => {
    setPhoneMsg('')
    try {
      setPhoneStatus(await verifyPhoneCode(phone, code))
      setSentTo('')
      setCode('')
      await refresh()
    } catch (err: any) {
      setPhoneMsg(err?.message || 'Could not verify.')
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>Account</h1>
        <button onClick={signOut} className="text-sm underline text-[#4B4B4B]">Sign out</button>
      </div>
      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Profile</h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <Field label="Email" value={customer.email} readOnly />
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
              <Field label="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <Button type="submit" variant="outline">{saved ? 'Saved ✓' : 'Save'}</Button>
          </form>

          <h2 className="text-lg mt-10 mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>Phone number</h2>
          <p className="text-xs text-[#8E8E8E] mb-3">A verified phone number is required to place orders.</p>
          {phoneStatus?.verified ? (
            <p className="text-sm text-green-700">Verified · {phoneStatus.phone_masked}</p>
          ) : phoneStatus === null ? (
            <p className="text-sm text-[#8E8E8E]">Phone verification isn&apos;t available on this server yet.</p>
          ) : null}
          <div className="mt-3 space-y-3">
            <Field label={phoneStatus?.verified ? 'Change number' : 'Phone number'} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(734) 555-0100" />
            {!sentTo ? (
              <Button variant="outline" onClick={sendCode} type="button" disabled={phoneStatus === null}>Send code</Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#4B4B4B]">We texted a 6-digit code to {sentTo}.</p>
                <Field label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
                <div className="flex gap-3">
                  <Button onClick={verify} type="button">Verify</Button>
                  <Button variant="ghost" onClick={() => setSentTo('')} type="button">Use a different number</Button>
                </div>
              </div>
            )}
            {phoneMsg && <p className="text-sm text-red-600">{phoneMsg}</p>}
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-[#4B4B4B]">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-[#e8e4dc]">
              {orders.map((o) => (
                <li key={o.id} className="py-3 text-sm flex justify-between">
                  <div>
                    <p>Order #{o.display_id}</p>
                    <p className="text-xs text-[#8E8E8E]">{formatDate(o.created_at)} · {(o.items ?? []).length} items · {o.status}</p>
                  </div>
                  <p>{formatPrice(o.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  )
}

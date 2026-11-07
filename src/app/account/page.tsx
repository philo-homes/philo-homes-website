'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import Shell from '@/components/Shell'
import { Button, Field } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'
import {
  changePassword, createAddress, deleteAccount, deleteAddress, getNewUserEligibility, getPhoneStatus, listAddresses, listOrders,
  PhoneStatus, requestPhoneCode, SavedAddress, submitReview, updateAddress, updateMe, verifyPhoneCode,
} from '@/lib/medusa'
import { formatDate, formatPrice } from '@/lib/format'
import { orderStatusColor, orderStatusLabel } from '@/lib/orders'
import { toast } from '@/components/Toast'

const EMPTY_ADDR: Omit<SavedAddress, 'id'> = { first_name: '', last_name: '', address_1: '', address_2: '', city: '', province: '', postal_code: '', country_code: 'us', phone: '' }

export default function AccountPage() {
  const { customer, loading, signOut, refresh } = useAuth()
  const [tab, setTab] = useState<'profile' | 'orders' | 'addresses' | 'security'>('profile')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [saved, setSaved] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null | undefined>(undefined)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [phoneMsg, setPhoneMsg] = useState('')
  const [promo, setPromo] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [editing, setEditing] = useState<Omit<SavedAddress, 'id'> & { id?: string } | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [pw, setPw] = useState({ current: '', next: '', msg: '' })

  useEffect(() => {
    if (!customer) return
    setFirst(customer.first_name ?? '')
    setLast(customer.last_name ?? '')
    setPhone(customer.phone ?? '')
    listOrders().then(setOrders).catch(() => setOrders([]))
    listAddresses().then(setAddresses).catch(() => setAddresses([]))
    getPhoneStatus().then(setPhoneStatus).catch(() => setPhoneStatus(null))
    getNewUserEligibility().then((e) => setPromo(e ? (e.eligible ? 'eligible' : e.reason) : null))
  }, [customer])

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) return <Shell><p className="text-sm"><Link href="/login?next=/account" className="underline">Sign in</Link> to see your account.</p></Shell>

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateMe({ first_name: first, last_name: last, phone: phone || null })
    await refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  const sendCode = async () => {
    setPhoneMsg('')
    try {
      const r = await requestPhoneCode(phone)
      if (r.already_verified) { setPhoneMsg('This number is already verified.'); setPhoneStatus(await getPhoneStatus()); return }
      setSentTo(r.phone_masked)
      if (r.dev_code) setCode(r.dev_code)
    } catch (err: any) { setPhoneMsg(err?.message || 'Could not send the code.') }
  }
  const verify = async () => {
    setPhoneMsg('')
    try { setPhoneStatus(await verifyPhoneCode(phone, code)); setSentTo(''); setCode(''); await refresh() }
    catch (err: any) { setPhoneMsg(err?.message || 'Could not verify.') }
  }
  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const { id, ...body } = editing
    if (id) await updateAddress(id, body)
    else await createAddress(body)
    setAddresses(await listAddresses())
    setEditing(null)
  }
  const rate = async (productId: string, rating: number) => {
    setRatings((r) => ({ ...r, [productId]: rating }))
    try {
      await submitReview({ product_id: productId, rating })
      toast.success('Thanks! Your rating was submitted.')
    } catch (err: any) {
      setRatings((r) => { const n = { ...r }; delete n[productId]; return n })
      toast.error(err?.status === 404 ? 'Ratings are not available on this server yet.' : err?.message || 'Could not submit rating.')
    }
  }
  const doChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await changePassword(pw.current, pw.next); setPw({ current: '', next: '', msg: 'Password updated.' }) }
    catch (err: any) { setPw((p) => ({ ...p, msg: err?.message || 'Could not change password.' })) }
  }
  const doDelete = async () => {
    if (!confirm('Delete your account permanently? This cannot be undone.')) return
    try { await deleteAccount(); signOut() } catch (err: any) { toast.error(err?.message || 'Could not delete account.') }
  }

  const TABS = [['profile', 'Profile'], ['orders', 'Orders'], ['addresses', 'Addresses'], ['security', 'Security']] as const

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>Account</h1>
        <button onClick={signOut} className="text-sm underline text-[#4B4B4B]">Sign out</button>
      </div>
      {promo === 'eligible' && (
        <div className="bg-[#FCF9F2] border border-[#E5C68C] p-4 text-sm mb-6">Welcome! As a new customer you can use the new-customer offer on your first order.</div>
      )}
      <div className="flex gap-6 border-b border-[#e8e4dc] mb-8 text-sm">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`pb-2 border-b-2 ${tab === id ? 'border-[#D1903E]' : 'border-transparent text-[#4B4B4B]'}`}>{label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="grid md:grid-cols-2 gap-10">
          <section>
            <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Profile</h2>
            <form onSubmit={saveProfile} className="space-y-3">
              <Field label="Email" value={customer.email} readOnly />
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
                <Field label="Last name" value={last} onChange={(e) => setLast(e.target.value)} />
              </div>
              <Field label="Phone (contact)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(734) 555-0100" />
              <Button type="submit" variant="outline">{saved ? 'Saved ✓' : 'Save'}</Button>
            </form>
            <p className="text-xs text-[#8E8E8E] mt-6">Need help? <Link href="/book-demo" className="underline">Contact us</Link>.</p>
          </section>
          <section>
            <h2 className="text-lg mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>Phone number</h2>
            <p className="text-xs text-[#8E8E8E] mb-3">A verified phone number is required to place orders.</p>
            {phoneStatus?.verified && <p className="text-sm text-green-700">Verified · {phoneStatus.phone_masked}</p>}
            {phoneStatus === null && <p className="text-sm text-[#8E8E8E]">Phone verification isn&apos;t available on this server yet.</p>}
            <div className="mt-3 space-y-3">
              <Field label={phoneStatus?.verified ? 'Change number' : 'Phone number'} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(734) 555-0100" />
              {!sentTo ? (
                <Button variant="outline" onClick={sendCode} type="button" disabled={phoneStatus === null}>Send code</Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#4B4B4B]">We texted a 6-digit code to {sentTo}.</p>
                  <Field label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
                  <div className="flex gap-3"><Button onClick={verify} type="button">Verify</Button><Button variant="ghost" onClick={() => setSentTo('')} type="button">Use a different number</Button></div>
                </div>
              )}
              {phoneMsg && <p className="text-sm text-red-600">{phoneMsg}</p>}
            </div>
          </section>
        </div>
      )}

      {tab === 'orders' && (
        <section>
          {orders.length === 0 ? <p className="text-sm text-[#4B4B4B]">No orders yet.</p> : (
            <ul className="divide-y divide-[#e8e4dc]">
              {orders.map((o) => {
                const label = orderStatusLabel(o)
                const color = orderStatusColor(label)
                return (
                <li key={o.id} className="py-4 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <Link href={`/account/orders/${o.id}`} className="underline">Order #{o.display_id}</Link>
                      <p className="text-xs text-[#8E8E8E] flex items-center gap-2">{formatDate(o.created_at)} <span className="inline-flex items-center gap-1" style={{ color }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />{label}</span></p>
                    </div>
                    <p>{formatPrice(o.total)}</p>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {(o.items ?? []).map((it: any) => {
                      const pid = it.product_id ?? it.variant?.product_id
                      return (
                        <li key={it.id} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#F5F4F0] shrink-0">
                            {it.thumbnail && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.thumbnail} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1"><p>{it.product_title ?? it.title}</p><p className="text-xs text-[#8E8E8E]">× {it.quantity}</p></div>
                          {pid && (
                            <div className="flex" title="Rate this product">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <button key={i} onClick={() => rate(pid, i + 1)} aria-label={`${i + 1} stars`}>
                                  <Star size={16} className={i < (ratings[pid] ?? 0) ? 'fill-[#D1903E] text-[#D1903E]' : 'text-[#CACACA]'} />
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-[11px] text-[#8E8E8E] mt-2">Only purchased items can be rated. Your review appears on the product page.</p>
                </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'addresses' && (
        <section>
          {editing ? (
            <form onSubmit={saveAddress} className="max-w-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" required value={editing.first_name ?? ''} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} />
                <Field label="Last name" required value={editing.last_name ?? ''} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} />
              </div>
              <Field label="Street address" required value={editing.address_1} onChange={(e) => setEditing({ ...editing, address_1: e.target.value })} />
              <Field label="Apt / unit (optional)" value={editing.address_2 ?? ''} onChange={(e) => setEditing({ ...editing, address_2: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" required value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                <Field label="State" required value={editing.province ?? ''} onChange={(e) => setEditing({ ...editing, province: e.target.value })} />
                <Field label="ZIP" required value={editing.postal_code} onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })} />
              </div>
              <Field label="Phone" value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              <div className="flex gap-3"><Button type="submit">Save address</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
            </form>
          ) : (
            <>
              {addresses.length === 0 ? <p className="text-sm text-[#4B4B4B] mb-4">No saved addresses.</p> : (
                <ul className="grid md:grid-cols-2 gap-4 mb-6">
                  {addresses.map((a) => (
                    <li key={a.id} className="border border-[#e8e4dc] p-4 text-sm">
                      <p>{a.first_name} {a.last_name}</p>
                      <p className="text-[#4B4B4B]">{a.address_1}{a.address_2 ? `, ${a.address_2}` : ''}</p>
                      <p className="text-[#4B4B4B]">{a.city}, {a.province} {a.postal_code}</p>
                      {a.phone && <p className="text-[#4B4B4B]">{a.phone}</p>}
                      <div className="flex gap-3 mt-3 text-xs">
                        <button onClick={() => setEditing({ ...EMPTY_ADDR, ...a })} className="underline">Edit</button>
                        <button onClick={async () => { await deleteAddress(a.id); setAddresses(await listAddresses()) }} className="underline text-[#8E8E8E] hover:text-red-600">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" onClick={() => setEditing({ ...EMPTY_ADDR, first_name: customer.first_name ?? '', last_name: customer.last_name ?? '' })}>Add address</Button>
            </>
          )}
        </section>
      )}

      {tab === 'security' && (
        <div className="grid md:grid-cols-2 gap-10">
          <section>
            <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Change password</h2>
            <form onSubmit={doChangePassword} className="space-y-3 max-w-sm">
              <Field label="Current password" type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              <Field label="New password" type="password" required minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              {pw.msg && <p className="text-sm">{pw.msg}</p>}
              <Button type="submit" variant="outline">Update password</Button>
            </form>
          </section>
          <section>
            <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Delete account</h2>
            <p className="text-sm text-[#4B4B4B] mb-4">Permanently deletes your account and sign-in. Orders already placed are kept for our records.</p>
            <Button variant="outline" onClick={doDelete} className="border-red-600 text-red-600 hover:bg-red-600">Delete my account</Button>
          </section>
        </div>
      )}
    </Shell>
  )
}

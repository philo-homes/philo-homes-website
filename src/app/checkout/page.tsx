'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import Shell from '@/components/Shell'
import { Button, Field } from '@/components/Section'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/config'
import { addShippingMethod, Address, applyPromoCode, completeCart, getPhoneStatus, initStripeSession, listAddresses, listShippingOptions, SavedAddress, updateCartCheckoutInfo } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

function PayStep({ cartId, onDone }: { cartId: string; onDone: (orderId: string, displayId?: number) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pay = async () => {
    if (!stripe || !elements) return
    setBusy(true)
    setError('')
    const { error: confirmError } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (confirmError) {
      setError(confirmError.message ?? 'Card was not accepted.')
      setBusy(false)
      return
    }
    try {
      const result = await completeCart(cartId)
      if (result.type === 'order') onDone(result.order.id, result.order.display_id)
      else setError(result.error?.message ?? 'Order could not be placed.')
    } catch (err: any) {
      setError(err?.message ?? 'Order could not be placed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={pay} disabled={busy || !stripe} className="w-full">{busy ? 'Processing…' : 'Place order'}</Button>
    </div>
  )
}

export default function CheckoutPage() {
  const { customer, loading } = useAuth()
  const { cart, refresh, setCart } = useCart()
  const router = useRouter()
  const [step, setStep] = useState<'shipping' | 'payment' | 'done'>('shipping')
  const [addr, setAddr] = useState<Address>({ first_name: '', last_name: '', address_1: '', city: '', province: '', postal_code: '', country_code: 'us', phone: '' })
  const [email, setEmail] = useState('')
  const [options, setOptions] = useState<{ id: string; name: string; amount: number }[]>([])
  const [optionId, setOptionId] = useState('')
  const [promo, setPromo] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderNo, setOrderNo] = useState<string>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phoneOk, setPhoneOk] = useState<boolean | null>(null)
  const [saved, setSavedAddresses] = useState<SavedAddress[]>([])
  const [usingSaved, setUsingSaved] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setEmail(customer.email)
      setAddr((a) => ({ ...a, first_name: customer.first_name ?? '', last_name: customer.last_name ?? '', phone: customer.phone ?? '' }))
      getPhoneStatus().then((s) => setPhoneOk(s.verified)).catch(() => setPhoneOk(null))
      listAddresses().then(setSavedAddresses).catch(() => setSavedAddresses([]))
    }
  }, [customer])

  useEffect(() => {
    if (cart?.id) listShippingOptions(cart.id).then(setOptions).catch(() => setOptions([]))
  }, [cart?.id])

  if (loading) return <Shell><p className="text-sm">Loading…</p></Shell>
  if (!customer) return <Shell><p className="text-sm"><Link href="/login?next=/checkout" className="underline">Sign in</Link> to check out.</p></Shell>
  if (!cart || cart.items.length === 0) {
    if (step !== 'done') return <Shell><p className="text-sm">Your cart is empty.</p></Shell>
  }

  const continueToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart) return
    setError('')
    if (phoneOk === false) {
      setError('A verified phone number is required to place an order. Verify it in your account first.')
      return
    }
    if (options.length > 0 && !optionId) {
      setError('Please choose a delivery option.')
      return
    }
    setBusy(true)
    try {
      let c = await updateCartCheckoutInfo(cart.id, { email, shipping_address: addr })
      if (optionId) c = await addShippingMethod(cart.id, optionId)
      if (promo.trim()) {
        try {
          c = await applyPromoCode(cart.id, promo.trim())
        } catch (err: any) {
          setCart(c)
          setError(err?.message ?? 'That promo code was not accepted. Remove it or try another.')
          return
        }
      }
      setCart(c)
      const secret = await initStripeSession(cart.id)
      setClientSecret(secret)
      setStep('payment')
    } catch (err: any) {
      setError(err?.message ?? 'Could not continue.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done') {
    return (
      <Shell>
        <div className="max-w-md mx-auto text-center py-16">
          <h1 className="text-3xl" style={{ fontFamily: "'Henry Trial', serif" }}>Thank you!</h1>
          <p className="text-sm text-[#4B4B4B] mt-3">Your order {orderNo} has been placed. You&apos;ll find it in your account and in the app.</p>
          <Button className="mt-8" onClick={() => router.push('/account')}>View orders</Button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-3xl text-center mb-2" style={{ fontFamily: "'Henry Trial', serif" }}>Secure Checkout</h1>
      <ol className="flex justify-center gap-8 text-xs text-[#8E8E8E] mb-10">
        {(['Shipping', 'Payment', 'Review'] as const).map((s, i) => (
          <li key={s} className={`flex items-center gap-2 ${(step === 'shipping' && i === 0) || (step === 'payment' && i === 1) ? 'text-[#D1903E]' : ''}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center">{i + 1}</span>{s}
          </li>
        ))}
      </ol>
      <div className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-7">
          {step === 'shipping' ? (
            <form onSubmit={continueToPayment} className="space-y-4">
              {phoneOk === false && (
                <div className="bg-[#FCF9F2] border border-[#E5C68C] p-4 text-sm">
                  A verified phone number is required to place an order. <Link href="/account" className="underline">Verify it now</Link>.
                </div>
              )}
              <h2 className="text-lg" style={{ fontFamily: "'Henry Trial', serif" }}>Shipping Address</h2>
              {saved.length > 0 && (
                <div>
                  <p className="text-xs text-[#4B4B4B] mb-2">Deliver to a saved address</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {saved.map((a) => {
                      const active = usingSaved === a.id
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setUsingSaved(a.id)
                            setAddr({
                              first_name: a.first_name ?? addr.first_name,
                              last_name: a.last_name ?? addr.last_name,
                              address_1: a.address_1,
                              address_2: a.address_2 ?? '',
                              city: a.city,
                              province: a.province ?? '',
                              postal_code: a.postal_code,
                              country_code: a.country_code || 'us',
                              phone: a.phone ?? addr.phone,
                            })
                          }}
                          className={`text-left text-sm border p-3 transition-colors ${active ? 'border-[#D1903E] bg-[#FCF9F2]' : 'border-[#e1e1e1] hover:border-[#10182B]'}`}
                        >
                          <span className="flex items-center justify-between">
                            <span className="font-medium">{a.first_name} {a.last_name}</span>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'border-[#D1903E]' : 'border-[#CACACA]'}`}>{active && <span className="w-2 h-2 rounded-full bg-[#D1903E]" />}</span>
                          </span>
                          <span className="block text-[#4B4B4B]">{a.address_1}{a.address_2 ? `, ${a.address_2}` : ''}</span>
                          <span className="block text-[#4B4B4B]">{a.city}, {a.province} {a.postal_code}</span>
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => { setUsingSaved('new'); setAddr({ ...addr, address_1: '', address_2: '', city: '', province: '', postal_code: '' }) }}
                      className={`text-left text-sm border border-dashed p-3 ${usingSaved === 'new' ? 'border-[#D1903E] bg-[#FCF9F2]' : 'border-[#CACACA] hover:border-[#10182B]'}`}
                    >
                      + Enter a new address
                    </button>
                  </div>
                  <p className="text-[11px] text-[#8E8E8E] mt-2">The fields below fill in automatically — you can still edit them.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" required value={addr.first_name} onChange={(e) => setAddr({ ...addr, first_name: e.target.value })} />
                <Field label="Last name" required value={addr.last_name} onChange={(e) => setAddr({ ...addr, last_name: e.target.value })} />
              </div>
              <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field label="Street address" required value={addr.address_1} onChange={(e) => setAddr({ ...addr, address_1: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" required value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                <Field label="State" required value={addr.province} onChange={(e) => setAddr({ ...addr, province: e.target.value })} />
                <Field label="ZIP" required value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} />
              </div>
              <Field label="Phone" value={addr.phone ?? ''} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
              <h2 className="text-lg pt-4" style={{ fontFamily: "'Henry Trial', serif" }}>Delivery</h2>
              {options.length === 0 ? (
                <p className="text-sm text-[#8E8E8E]">No delivery options are configured for this cart yet.</p>
              ) : (
                <div className="space-y-2">
                  {options.map((o) => (
                    <label key={o.id} className="flex items-center justify-between border border-[#e1e1e1] px-3 py-2 text-sm cursor-pointer">
                      <span className="flex items-center gap-2"><input type="radio" name="ship" checked={optionId === o.id} onChange={() => setOptionId(o.id)} /> {o.name}</span>
                      <span>{formatPrice(o.amount)}</span>
                    </label>
                  ))}
                </div>
              )}
              <Field label="Promo code (optional)" value={promo} onChange={(e) => setPromo(e.target.value)} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : 'Continue to payment'}</Button>
            </form>
          ) : (
            <div>
              <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Billing &amp; Payment</h2>
              {!stripePromise ? (
                <p className="text-sm text-[#4B4B4B]">Card payment isn&apos;t configured on this site yet (missing Stripe publishable key).</p>
              ) : !clientSecret ? (
                <p className="text-sm text-[#4B4B4B]">Card payment isn&apos;t available right now. Please try again shortly.</p>
              ) : (
                <Elements stripe={stripePromise} options={{ clientSecret, locale: 'en', appearance: { variables: { colorPrimary: '#D1903E', borderRadius: '0px', fontFamily: 'GT America, sans-serif' } } }}>
                  <PayStep cartId={cart!.id} onDone={(id, displayId) => { setOrderNo(displayId ? `#${displayId}` : id); setStep('done'); refresh() }} />
                </Elements>
              )}
              <button onClick={() => setStep('shipping')} className="text-xs underline text-[#4B4B4B] mt-6">Back to shipping</button>
            </div>
          )}
        </div>
        <aside className="md:col-span-5 bg-[#FCF9F2] p-6 h-fit">
          <h2 className="text-lg mb-4" style={{ fontFamily: "'Henry Trial', serif" }}>Order Summary</h2>
          <ul className="text-sm space-y-2 mb-4">
            {cart?.items.map((li) => (
              <li key={li.id} className="flex justify-between gap-3"><span>{li.product_title ?? li.title} × {li.quantity}</span><span>{formatPrice(li.unit_price * li.quantity)}</span></li>
            ))}
          </ul>
          <dl className="text-sm space-y-1 border-t border-[#e8e4dc] pt-3">
            <div className="flex justify-between"><dt>Items</dt><dd>{formatPrice(cart?.item_subtotal ?? null)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{formatPrice(cart?.shipping_total ?? 0)}</dd></div>
            <div className="flex justify-between"><dt>Tax</dt><dd>{formatPrice(cart?.tax_total ?? 0)}</dd></div>
            <div className="flex justify-between font-medium pt-1"><dt>Total</dt><dd>{formatPrice(cart?.total ?? null)}</dd></div>
          </dl>
        </aside>
      </div>
    </Shell>
  )
}

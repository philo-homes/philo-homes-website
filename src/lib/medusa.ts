'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CART_STORAGE_KEY,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_REGION_ID,
  MEDUSA_URL,
  STRIPE_PROVIDER_ID,
  TOKEN_STORAGE_KEY,
} from './config'

// ---------------------------------------------------------------------------
// Thin client for the Medusa store API. Mirrors the mobile app's services so
// the website and the app stay interchangeable for the same account.
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // storage blocked — session will be memory-only
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`
  let code: string | undefined
  try {
    const body = await res.json()
    if (typeof body?.message === 'string') message = body.message
    if (typeof body?.code === 'string') code = body.code
  } catch {
    // non-JSON
  }
  return new ApiError(res.status, message, code)
}

export async function storeFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown; auth?: boolean; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
  }
  const token = init.token ?? (init.auth === false ? null : getToken())
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return res.json()
}

// ---- Products ---------------------------------------------------------------

export type Product = {
  id: string
  handle: string
  title: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  images: { id: string; url: string }[]
  collection?: { id: string; title: string; handle: string } | null
  categories?: { id: string; name: string; handle: string }[]
  tags?: { id: string; value: string }[]
  metadata?: Record<string, any> | null
  variants: {
    id: string
    title: string
    sku?: string | null
    calculated_price?: { calculated_amount: number; currency_code: string } | null
  }[]
}

export function productPrice(p: Product): number | null {
  const v = p.variants?.[0]
  const amount = v?.calculated_price?.calculated_amount
  return typeof amount === 'number' ? amount : null
}
export function productImage(p: Product): string {
  return p.images?.[0]?.url || p.thumbnail || ''
}

const PRODUCT_FIELDS = '*variants.calculated_price,+variants.sku,*images,*collection,*categories,*tags,+metadata'

export async function listProducts(params: { q?: string; limit?: number; collection_id?: string } = {}) {
  const sp = new URLSearchParams({
    region_id: MEDUSA_REGION_ID,
    limit: String(params.limit ?? 100),
    fields: PRODUCT_FIELDS,
  })
  if (params.q) sp.set('q', params.q)
  if (params.collection_id) sp.set('collection_id[]', params.collection_id)
  const data = await storeFetch<{ products: Product[]; count: number }>(
    `/store/products?${sp.toString()}`,
    { auth: false },
  )
  return data.products ?? []
}

export async function getProductByHandle(handle: string): Promise<Product | null> {
  const sp = new URLSearchParams({ region_id: MEDUSA_REGION_ID, handle, fields: PRODUCT_FIELDS })
  const data = await storeFetch<{ products: Product[] }>(`/store/products?${sp.toString()}`, { auth: false })
  return data.products?.[0] ?? null
}

export async function getProductById(id: string): Promise<Product | null> {
  const sp = new URLSearchParams({ region_id: MEDUSA_REGION_ID, fields: PRODUCT_FIELDS })
  try {
    const data = await storeFetch<{ product: Product }>(`/store/products/${id}?${sp.toString()}`, { auth: false })
    return data.product ?? null
  } catch {
    return null
  }
}

// The AI pipeline identifies furniture by catalog SKU (stored on the variant).
// Same approach as the app: scan the (small) catalog for the matching variant.
let catalogCache: { at: number; products: Product[] } | null = null
export async function catalog(): Promise<Product[]> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60 * 1000) return catalogCache.products
  const products = await listProducts({ limit: 100 })
  catalogCache = { at: Date.now(), products }
  return products
}
export async function resolveSku(sku: string): Promise<Product | null> {
  const products = await catalog()
  return products.find((p) => p.variants?.some((v) => v.sku === sku)) ?? null
}

export async function listCollections() {
  try {
    const data = await storeFetch<{ collections: { id: string; title: string; handle: string }[] }>(
      '/store/collections?limit=50',
      { auth: false },
    )
    return data.collections ?? []
  } catch {
    return []
  }
}

// ---- Reviews (backend product-review module; silent when not deployed) -----

export type ReviewSummary = {
  stats: { average: number; count: number; breakdown: Record<string, number> }
  reviews: { id: string; display_name: string; rating: number; content: string | null; created_at: string; is_mine?: boolean }[]
}
export async function getReviews(productId: string): Promise<ReviewSummary | null> {
  try {
    return await storeFetch<ReviewSummary>(`/store/products/${productId}/reviews`)
  } catch {
    return null
  }
}

// ---- Auth / customer ----------------------------------------------------------

export type Customer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  metadata?: Record<string, any> | null
}

export async function login(email: string, password: string): Promise<string> {
  const data = await storeFetch<{ token: string }>('/auth/customer/emailpass', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  return data.token
}

export async function register(input: { email: string; password: string; first_name?: string; last_name?: string }) {
  // Medusa v2: register the auth identity, create the customer with that
  // token, then log in to get a token bound to the new customer.
  const reg = await storeFetch<{ token: string }>('/auth/customer/emailpass/register', {
    method: 'POST',
    body: { email: input.email, password: input.password },
    auth: false,
  })
  await storeFetch('/store/customers', {
    method: 'POST',
    body: { email: input.email, first_name: input.first_name ?? '', last_name: input.last_name ?? '' },
    token: reg.token,
  })
  return login(input.email, input.password)
}

export async function getMe(token?: string | null): Promise<Customer> {
  const data = await storeFetch<{ customer: Customer }>('/store/customers/me', token ? { token } : {})
  return data.customer
}

export async function updateMe(body: Record<string, unknown>): Promise<Customer> {
  const data = await storeFetch<{ customer: Customer }>('/store/customers/me', { method: 'POST', body })
  return data.customer
}

// Per-key metadata merge (Medusa merges metadata keys; same channel the app
// uses for wishlist / design names / cart pointer).
export async function setMetadata(metadata: Record<string, unknown>) {
  return updateMe({ metadata })
}

// ---- Phone verification (backend customer-identity module) --------------------

export type PhoneStatus = { verified: boolean; phone: string | null; phone_masked: string | null }
export const getPhoneStatus = () => storeFetch<PhoneStatus>('/store/customers/me/phone')
export const requestPhoneCode = (phone: string) =>
  storeFetch<{ sent: boolean; already_verified?: boolean; phone_masked: string; dev_code?: string }>(
    '/store/customers/me/phone/request-code',
    { method: 'POST', body: { phone } },
  )
export const verifyPhoneCode = (phone: string, code: string) =>
  storeFetch<PhoneStatus>('/store/customers/me/phone/verify', { method: 'POST', body: { phone, code } })

// ---- Orders ---------------------------------------------------------------------

export async function listOrders() {
  const data = await storeFetch<{ orders: any[] }>('/store/orders?limit=50&order=-created_at')
  return data.orders ?? []
}

// ---- Cart ---------------------------------------------------------------------

export type Cart = {
  id: string
  email?: string | null
  customer_id?: string | null
  items: {
    id: string
    title: string
    thumbnail?: string | null
    quantity: number
    unit_price: number
    variant_id: string
    product_id?: string
    product_handle?: string
    product_title?: string
  }[]
  subtotal?: number
  total?: number
  shipping_total?: number
  tax_total?: number
  shipping_methods?: { id: string; shipping_option_id: string }[]
  payment_collection?: { id: string; payment_sessions?: { id: string; provider_id: string; data?: any }[] } | null
}

const ACTIVE_CART_META_KEY = 'active_cart_id'

export function getStoredCartId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY)
  } catch {
    return null
  }
}
export function setStoredCartId(id: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (id) window.localStorage.setItem(CART_STORAGE_KEY, id)
    else window.localStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export async function getCart(id: string): Promise<Cart | null> {
  try {
    const data = await storeFetch<{ cart: Cart }>(`/store/carts/${id}`)
    return data.cart
  } catch {
    return null
  }
}

export async function createCart(): Promise<Cart> {
  const data = await storeFetch<{ cart: Cart }>('/store/carts', {
    method: 'POST',
    body: { region_id: MEDUSA_REGION_ID },
  })
  return data.cart
}

// Same cart as the app: for a signed-in customer the metadata pointer
// (active_cart_id) wins, so adding on the phone shows up here and vice versa.
export async function ensureCart(customer: Customer | null): Promise<Cart> {
  const remoteId = customer?.metadata?.[ACTIVE_CART_META_KEY]
  if (typeof remoteId === 'string' && remoteId) {
    const cart = await getCart(remoteId)
    if (cart && !(cart as any).completed_at) {
      setStoredCartId(cart.id)
      return cart
    }
  }
  const localId = getStoredCartId()
  if (localId) {
    const cart = await getCart(localId)
    if (cart && !(cart as any).completed_at) {
      if (customer && cart.customer_id !== customer.id) {
        // Adopt a guest cart into the account so the app sees it too.
        try {
          await storeFetch(`/store/carts/${cart.id}/customer`, { method: 'POST' })
        } catch {
          // ignore — the cart still works for this session
        }
      }
      if (customer) setMetadata({ [ACTIVE_CART_META_KEY]: cart.id }).catch(() => {})
      return cart
    }
  }
  const cart = await createCart()
  setStoredCartId(cart.id)
  if (customer) setMetadata({ [ACTIVE_CART_META_KEY]: cart.id }).catch(() => {})
  return cart
}

export async function addLineItem(cartId: string, variantId: string, quantity = 1): Promise<Cart> {
  const data = await storeFetch<{ cart: Cart }>(`/store/carts/${cartId}/line-items`, {
    method: 'POST',
    body: { variant_id: variantId, quantity },
  })
  return data.cart
}
export async function updateLineItem(cartId: string, lineId: string, quantity: number): Promise<Cart> {
  const data = await storeFetch<{ cart: Cart }>(`/store/carts/${cartId}/line-items/${lineId}`, {
    method: 'POST',
    body: { quantity },
  })
  return data.cart
}
export async function removeLineItem(cartId: string, lineId: string): Promise<Cart> {
  await storeFetch(`/store/carts/${cartId}/line-items/${lineId}`, { method: 'DELETE' })
  return (await getCart(cartId)) as Cart
}

// ---- Checkout ------------------------------------------------------------------

export type Address = {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  province: string
  postal_code: string
  country_code: string
  phone?: string
}

export async function updateCartCheckoutInfo(cartId: string, body: { email: string; shipping_address: Address; billing_address?: Address }) {
  const data = await storeFetch<{ cart: Cart }>(`/store/carts/${cartId}`, { method: 'POST', body })
  return data.cart
}
export async function listShippingOptions(cartId: string) {
  const data = await storeFetch<{ shipping_options: { id: string; name: string; amount: number }[] }>(
    `/store/shipping-options?cart_id=${cartId}`,
  )
  return data.shipping_options ?? []
}
export async function addShippingMethod(cartId: string, optionId: string) {
  const data = await storeFetch<{ cart: Cart }>(`/store/carts/${cartId}/shipping-methods`, {
    method: 'POST',
    body: { option_id: optionId },
  })
  return data.cart
}
export async function applyPromoCode(cartId: string, code: string) {
  const data = await storeFetch<{ cart: Cart }>(`/store/carts/${cartId}/promotions`, {
    method: 'POST',
    body: { promo_codes: [code] },
  })
  return data.cart
}
export async function initStripeSession(cartId: string): Promise<string | null> {
  const cart = await getCart(cartId)
  let collectionId = cart?.payment_collection?.id
  if (!collectionId) {
    const pc = await storeFetch<{ payment_collection: { id: string } }>('/store/payment-collections', {
      method: 'POST',
      body: { cart_id: cartId },
    })
    collectionId = pc.payment_collection.id
  }
  const data = await storeFetch<{ payment_collection: { payment_sessions?: { provider_id: string; data?: any }[] } }>(
    `/store/payment-collections/${collectionId}/payment-sessions`,
    { method: 'POST', body: { provider_id: STRIPE_PROVIDER_ID } },
  )
  const session = data.payment_collection.payment_sessions?.find((s) => s.provider_id === STRIPE_PROVIDER_ID)
  return session?.data?.client_secret ?? null
}
export type CompleteResult = { type: 'order'; order: any } | { type: 'cart'; error?: { message: string } }
export async function completeCart(cartId: string): Promise<CompleteResult> {
  return storeFetch<CompleteResult>(`/store/carts/${cartId}/complete`, { method: 'POST' })
}

// ---- Wishlist (customer metadata, same shape as the app) ----------------------

export type WishlistItem = { id: string; name: string; price: number; image: string; addedDate: string }

export function readWishlist(customer: Customer | null): WishlistItem[] {
  const raw = customer?.metadata?.wishlist
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
export async function writeWishlist(items: WishlistItem[]) {
  return setMetadata({ wishlist: JSON.stringify(items), wishlist_updated_at: new Date().toISOString() })
}

// ---- Design names + edits (customer metadata) ------------------------------------

export function readDesignNames(customer: Customer | null): Record<string, string> {
  const raw = customer?.metadata?.design_names
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return {}
  }
}
export async function writeDesignName(customer: Customer, taskId: string, name: string) {
  const names = { ...readDesignNames(customer), [taskId]: name }
  return setMetadata({ design_names: JSON.stringify(names) })
}

export type DesignEdit = {
  removed: string[]
  added: { id: string; productId: string; name: string; image: string; url?: string; position: [number, number, number] }[]
}
export function readDesignEdits(customer: Customer | null): Record<string, DesignEdit> {
  const raw = customer?.metadata?.design_edits
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return {}
  }
}
export async function writeDesignEdit(customer: Customer, taskId: string, edit: DesignEdit) {
  const all = { ...readDesignEdits(customer), [taskId]: edit }
  return setMetadata({ design_edits: JSON.stringify(all) })
}

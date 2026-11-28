'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CART_STORAGE_KEY,
  MEDUSA_REGION_ID,
  STRIPE_PROVIDER_ID,
  TOKEN_STORAGE_KEY,
} from './config'

// All browser calls go through our same-origin proxy (src/app/api/medusa),
// which adds the publishable key and forwards to the real backend — the
// backend's CORS allow-list doesn't include this site.
const API_BASE = '/api/medusa'

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
  }
  const token = init.token ?? (init.auth === false ? null : getToken())
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
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
  material?: string | null
  length?: number | null
  width?: number | null
  height?: number | null
  weight?: number | null
  options?: { id: string; title: string; values?: { id: string; value: string }[] }[]
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

// NOTE: no `*categories` here — the single-product endpoint answers
// "not found" for a product with zero categories when that relation is
// requested (every live product currently has none).
const PRODUCT_FIELDS = '*variants.calculated_price,+variants.sku,*images,*collection,*tags,+metadata,+material,+length,+width,+height,+weight,*options,*options.values'

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
  // The store API returns at most 100 per page; walk pages (cap 1000).
  const products: Product[] = []
  for (let offset = 0; offset < 1000; offset += 100) {
    const sp = new URLSearchParams({ region_id: MEDUSA_REGION_ID, limit: '100', offset: String(offset), fields: PRODUCT_FIELDS })
    const data = await storeFetch<{ products: Product[]; count: number }>(`/store/products?${sp.toString()}`, { auth: false })
    products.push(...(data.products ?? []))
    if (products.length >= (data.count ?? 0) || (data.products ?? []).length < 100) break
  }
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

// Submit/update a rating for a purchased product (backend verifies the purchase).
export async function submitReview(input: { product_id: string; rating: number; content?: string }) {
  return storeFetch('/store/reviews', { method: 'POST', body: input })
}

// ---- Addresses (Medusa v2 customer addresses, same as the app) ---------------

export type SavedAddress = {
  id: string
  first_name?: string | null
  last_name?: string | null
  address_1: string
  address_2?: string | null
  city: string
  province?: string | null
  postal_code: string
  country_code: string
  phone?: string | null
  address_name?: string | null
  is_default_shipping?: boolean
}
export async function listAddresses(): Promise<SavedAddress[]> {
  const data = await storeFetch<{ addresses: SavedAddress[] }>('/store/customers/me/addresses')
  return data.addresses ?? []
}
export async function createAddress(body: Omit<SavedAddress, 'id'>) {
  return storeFetch<{ customer: Customer }>('/store/customers/me/addresses', { method: 'POST', body })
}
export async function updateAddress(id: string, body: Partial<Omit<SavedAddress, 'id'>>) {
  return storeFetch<{ customer: Customer }>(`/store/customers/me/addresses/${id}`, { method: 'POST', body })
}
export async function deleteAddress(id: string) {
  return storeFetch(`/store/customers/me/addresses/${id}`, { method: 'DELETE' })
}

// ---- Account security (custom backend routes, same as the app) ---------------

export async function changePassword(current_password: string, new_password: string) {
  return storeFetch('/store/customers/me/change-password', { method: 'POST', body: { current_password, new_password } })
}
export async function deleteAccount() {
  return storeFetch('/store/customers/me/delete-account', { method: 'POST' })
}
// Sends the reset email (SES on the backend). Always resolves — the backend
// does not reveal whether the email exists.
export async function requestPasswordReset(email: string) {
  try {
    await storeFetch('/auth/customer/emailpass/reset-password', { method: 'POST', body: { identifier: email }, auth: false })
  } catch {
    // swallow — see above
  }
}

// ---- New-customer offer (backend customer-identity module) --------------------
export type NewUserEligibility = { eligible: true } | { eligible: false; reason: string }
export async function getNewUserEligibility(): Promise<NewUserEligibility | null> {
  try {
    return await storeFetch<NewUserEligibility>('/store/promo/new-user')
  } catch {
    return null
  }
}

// ---- Blog comments (backend blog-comment module; moderated) ---------------------

export type BlogComment = {
  id: string
  parent_id: string | null
  display_name: string
  body: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string | null
  is_mine: boolean
  replies?: BlogComment[]
}
// Approved comments, threaded. With a customer token the reader's own pending/rejected
// ones are included too (is_mine + status), so they can see "awaiting review".
export async function listBlogComments(slug: string) {
  return storeFetch<{ comments: BlogComment[]; count: number }>(`/store/blog/${encodeURIComponent(slug)}/comments`)
}
// Always stored as pending; an admin approves it in Medusa Admin before anyone else sees it.
export async function postBlogComment(slug: string, body: string, parent_id?: string) {
  const data = await storeFetch<{ comment: BlogComment }>(`/store/blog/${encodeURIComponent(slug)}/comments`, {
    method: 'POST',
    body: { body, parent_id: parent_id ?? null },
  })
  return data.comment
}

// ---- Orders ---------------------------------------------------------------------

// `*fulfillments(.items|.labels)` = which items shipped in which box, with tracking. The
// nested two need the backend's allowFields for /store/orders* (src/api/middlewares.ts);
// an older server just omits them and the pages fall back to a plain item list.
const ORDER_FIELDS = '+status,+fulfillment_status,+payment_status,*items,*shipping_address,+subtotal,+shipping_total,+tax_total,+discount_total,+total,*fulfillments,*fulfillments.items,*fulfillments.labels'
export async function listOrders() {
  const data = await storeFetch<{ orders: any[] }>(`/store/orders?limit=50&order=-created_at&fields=${encodeURIComponent(ORDER_FIELDS)}`)
  return data.orders ?? []
}
export async function getOrder(id: string) {
  const data = await storeFetch<{ order: any }>(`/store/orders/${id}?fields=${encodeURIComponent(ORDER_FIELDS)}`)
  return data.order
}

// ---- Recently viewed (customer metadata browsing_history, same as the app) ----

export type HistoryItem = { id: string; name: string; image: string; price: number; viewedAt?: string }
const HISTORY_MAX = 20
export function readHistory(customer: Customer | null): HistoryItem[] {
  const raw = customer?.metadata?.browsing_history
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
export async function recordView(customer: Customer | null, item: HistoryItem) {
  if (!customer) return
  const next = [{ ...item, viewedAt: new Date().toISOString() }, ...readHistory(customer).filter((h) => h.id !== item.id)].slice(0, HISTORY_MAX)
  await setMetadata({ browsing_history: JSON.stringify(next) })
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
  item_subtotal?: number
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
  const localId = getStoredCartId()
  if (typeof remoteId === 'string' && remoteId) {
    let cart = await getCart(remoteId)
    if (cart && !(cart as any).completed_at) {
      // Signing in with items added as a guest: merge them into the account's
      // cart instead of silently dropping them.
      if (localId && localId !== cart.id) {
        const guest = await getCart(localId)
        if (guest && !(guest as any).completed_at && !guest.customer_id) {
          for (const li of guest.items ?? []) {
            try {
              cart = await addLineItem(cart.id, li.variant_id, li.quantity)
            } catch {
              // item no longer purchasable — skip it
            }
          }
        }
      }
      setStoredCartId(cart.id)
      return cart
    }
  }
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

export async function addLineItem(cartId: string, variantId: string, quantity = 1, metadata?: Record<string, unknown>): Promise<Cart> {
  const data = await storeFetch<{ cart: Cart }>(`/store/carts/${cartId}/line-items`, {
    method: 'POST',
    body: { variant_id: variantId, quantity, ...(metadata ? { metadata } : {}) },
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
// Albums ("专辑"): a folder is a named subset of the flat wishlist, stored as
// item ids. Synced under the same wishlist_updated_at clock as the app.
export type WishlistFolder = { id: string; name: string; itemIds: string[]; createdAt: string }
export function readWishlistFolders(customer: Customer | null): WishlistFolder[] {
  const raw = customer?.metadata?.wishlist_folders
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
export async function writeWishlist(items: WishlistItem[], folders?: WishlistFolder[]) {
  const body: Record<string, unknown> = { wishlist: JSON.stringify(items), wishlist_updated_at: new Date().toISOString() }
  if (folders) body.wishlist_folders = JSON.stringify(folders)
  return setMetadata(body)
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

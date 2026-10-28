// Same backend, same publishable key and region as the mobile app, so a
// customer who signs in here sees the same account, cart, wishlist and designs.
// Override per environment with NEXT_PUBLIC_* vars (see .env.example).
export const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL ||
  'https://vppdwjvjp8.us-east-1.awsapprunner.com'
export const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  'pk_f2922fcf2f4493625e03a580f792bde7531bc1250a4522a31fb7b656d0845f90'
export const MEDUSA_REGION_ID =
  process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || 'reg_01KWT7HZ63NSY0JWN26DP27RHG'
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
export const STRIPE_PROVIDER_ID = 'pp_stripe_stripe'

// AI design pipeline (Cloud Run). Server-side only — the browser talks to our
// /api/designs routes, which authenticate the caller and proxy these.
export const TASK_STATUS_API =
  process.env.TASK_STATUS_API_URL ||
  'https://task-status-history-api-518207605569.us-central1.run.app'
export const TASK_RESULT_API =
  process.env.TASK_RESULT_API_URL ||
  'https://get-result-518207605569.us-central1.run.app'

export const TOKEN_STORAGE_KEY = 'ph_token'
export const CART_STORAGE_KEY = 'ph_cart_id'

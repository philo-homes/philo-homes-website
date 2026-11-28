// Defaults are AWS **dev** — the same Medusa and pipeline API as the app's
// "development" build (eas.json), so a customer who signs in here sees the same
// account, cart, wishlist and rooms/designs as in a dev build of the app.
// Production must set the NEXT_PUBLIC_* / PIPELINE_API_URL vars (see .env.example).
export const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL ||
  'https://u3yy7kw8gj.us-east-1.awsapprunner.com'
export const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  'pk_f2922fcf2f4493625e03a580f792bde7531bc1250a4522a31fb7b656d0845f90'
export const MEDUSA_REGION_ID =
  process.env.NEXT_PUBLIC_MEDUSA_REGION_ID || 'reg_01KWT7HZ63NSY0JWN26DP27RHG'
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
export const STRIPE_PROVIDER_ID = 'pp_stripe_stripe'

// Rooms & designs (pipeline v2 rooms API, API Gateway in AWS dev). Server-side
// only — the browser talks to our /api/designs routes, which forward the
// customer's Medusa token; the pipeline API checks it against the same Medusa.
export const PIPELINE_API =
  process.env.PIPELINE_API_URL ||
  'https://exxfdi0dfc.execute-api.us-east-1.amazonaws.com'

export const TOKEN_STORAGE_KEY = 'ph_token'
export const CART_STORAGE_KEY = 'ph_cart_id'

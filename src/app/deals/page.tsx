import { redirect } from 'next/navigation'

// Deals now live on the shop page (banner + rail); keep old links working.
export default function DealsPage() {
  redirect('/shop#deals')
}

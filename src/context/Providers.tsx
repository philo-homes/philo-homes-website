'use client'

import { AuthProvider } from './AuthContext'
import { CartProvider } from './CartContext'
import { WishlistProvider } from './WishlistContext'
import ToastHost from '@/components/Toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
          <ToastHost />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}

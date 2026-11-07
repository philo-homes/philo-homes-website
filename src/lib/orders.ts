// Order status presentation — identical rules to the app's order.service.ts.
export type OrderLike = { status?: string; fulfillment_status?: string; payment_status?: string }

export function orderStatusLabel(order: OrderLike): string {
  if (order.status === 'canceled') return 'Canceled'
  switch (order.fulfillment_status) {
    case 'delivered':
    case 'partially_delivered':
      return 'Delivered'
    case 'shipped':
    case 'partially_shipped':
      return 'Shipped'
    case 'fulfilled':
    case 'partially_fulfilled':
      return 'Preparing'
    default:
      return 'Processing'
  }
}

export function orderStatusColor(label: string): string {
  switch (label) {
    case 'Delivered': return '#1E824C'
    case 'Shipped': return '#2E6DA4'
    case 'Canceled': return '#C0392B'
    default: return '#D1903E'
  }
}

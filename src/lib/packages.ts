// Groups an order's items into the packages they ship in.
//
// Medusa models "one order, several boxes from several places" as one order
// with many fulfillments. Each fulfillment knows which line items (and how
// many of each) it holds, when it was packed / shipped / delivered, and its
// tracking labels. This file turns that into something a customer can read:
// "Package 1 of 3 · Shipped Nov 12 · UPS 1Z… · [lamp, rug]" plus a
// "Not shipped yet" group for anything still waiting.
//
// Pure functions, no I/O — shared verbatim with the app (src/services/orderPackages.ts).

export type PackageStatus = 'delivered' | 'shipped' | 'packed' | 'preparing';

export interface TrackingLine {
  number: string;
  carrier: string | null;
  url: string | null;
}

export interface PackageItem {
  lineItemId: string | null;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unitPrice: number;
  productId?: string;
  variantTitle?: string;
}

export interface OrderPackage {
  id: string;
  status: PackageStatus;
  /** ISO date of the latest milestone (delivered > shipped > packed). */
  date: string | null;
  tracking: TrackingLine[];
  items: PackageItem[];
}

export interface PackagesView {
  packages: OrderPackage[];
  /** Line items (or the remaining quantity of them) not in any package yet. */
  unshipped: PackageItem[];
  /**
   * False when the server sent fulfillments without their items (the backend
   * allow-list is missing). Packages are still shown, but we can't say which
   * item is in which box, so callers should keep a plain item list too.
   */
  itemsKnown: boolean;
}

// The subset of a Medusa line item we need. Both the app's mapped
// OrderLineItem and the website's raw Medusa item satisfy it.
export interface PackageLineItemLike {
  id: string;
  title?: string | null;
  product_title?: string | null;
  variant_title?: string | null;
  thumbnail?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  product_id?: string | null;
}

export interface RawFulfillment {
  id: string;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  canceled_at?: string | null;
  items?: Array<{
    line_item_id?: string | null;
    quantity?: number | string | null;
    title?: string | null;
  }> | null;
  labels?: Array<{
    tracking_number?: string | null;
    tracking_url?: string | null;
  }> | null;
}

// ---- Carrier detection (same rules as the backend's shipment email) ---------

/** Only plain http(s) URLs are openable; anything else is dropped. */
export function safeTrackingUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:'
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Carrier from the tracking number's format, with its public tracking page.
 *   UPS   1Z + 16 alphanumerics
 *   USPS  92/93/94/95 + 20-24 digits, or 20-22 digits starting with 9
 *   FedEx 12, 15, 20 or 22 digits
 *   DHL   10 digits
 */
export function detectCarrier(
  trackingNumber: string,
): { carrier: string; url: string } | null {
  const n = trackingNumber.replace(/\s+/g, '').toUpperCase();
  if (/^1Z[0-9A-Z]{16}$/.test(n)) {
    return { carrier: 'UPS', url: `https://www.ups.com/track?tracknum=${n}` };
  }
  if (/^(9[2345]\d{20,24}|\d{20,22})$/.test(n) && /^9/.test(n)) {
    return {
      carrier: 'USPS',
      url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
    };
  }
  if (/^(\d{12}|\d{15}|\d{20}|\d{22})$/.test(n)) {
    return {
      carrier: 'FedEx',
      url: `https://www.fedex.com/fedextrack/?trknbr=${n}`,
    };
  }
  if (/^\d{10}$/.test(n)) {
    return {
      carrier: 'DHL',
      url: `https://www.dhl.com/en/express/tracking.html?AWB=${n}`,
    };
  }
  return null;
}

/** Every label of a fulfillment: the admin's URL wins; otherwise the carrier's page. */
export function trackingLines(
  labels: RawFulfillment['labels'],
): TrackingLine[] {
  const out: TrackingLine[] = [];
  for (const l of labels ?? []) {
    const number = (l?.tracking_number ?? '').trim();
    const typed = safeTrackingUrl(l?.tracking_url);
    if (!number && !typed) continue;
    const guess = number ? detectCarrier(number) : null;
    out.push({
      number,
      carrier: guess?.carrier ?? null,
      url: typed ?? guess?.url ?? null,
    });
  }
  return out;
}

// ---- Grouping ---------------------------------------------------------------

function packageStatus(f: RawFulfillment): PackageStatus {
  if (f.delivered_at) return 'delivered';
  if (f.shipped_at) return 'shipped';
  if (f.packed_at) return 'packed';
  return 'preparing';
}

function toPackageItem(
  line: PackageLineItemLike | undefined,
  fallbackTitle: string | null | undefined,
  quantity: number,
): PackageItem {
  return {
    lineItemId: line?.id ?? null,
    title: line?.title ?? line?.product_title ?? fallbackTitle ?? 'Item',
    thumbnail: line?.thumbnail ?? null,
    quantity,
    unitPrice: line?.unit_price ?? 0,
    productId: line?.product_id ?? undefined,
    variantTitle: line?.variant_title ?? undefined,
  };
}

/**
 * Returns null when the order has no `fulfillments` array at all (older
 * server, or the field wasn't requested) — the caller then renders the plain
 * item list exactly as before.
 */
export function buildPackages(
  items: PackageLineItemLike[],
  fulfillments: RawFulfillment[] | null | undefined,
): PackagesView | null {
  if (!Array.isArray(fulfillments)) return null;

  const byId = new Map<string, PackageLineItemLike>();
  for (const it of items) byId.set(it.id, it);

  const remaining = new Map<string, number>();
  for (const it of items) remaining.set(it.id, Number(it.quantity ?? 0));

  const live = fulfillments.filter(f => f && !f.canceled_at);
  const itemsKnown = live.every(f => Array.isArray(f.items));

  const packages: OrderPackage[] = live.map(f => {
    const pkgItems: PackageItem[] = [];
    for (const fi of f.items ?? []) {
      const qty = Number(fi?.quantity ?? 0);
      if (qty <= 0) continue;
      const line = fi?.line_item_id ? byId.get(fi.line_item_id) : undefined;
      pkgItems.push(toPackageItem(line, fi?.title, qty));
      if (line) {
        remaining.set(line.id, (remaining.get(line.id) ?? 0) - qty);
      }
    }
    return {
      id: f.id,
      status: packageStatus(f),
      date: f.delivered_at ?? f.shipped_at ?? f.packed_at ?? null,
      tracking: trackingLines(f.labels),
      items: pkgItems,
    };
  });

  // Delivered first, then shipped, then the rest — newest milestone on top.
  const rank: Record<PackageStatus, number> = {
    delivered: 0,
    shipped: 1,
    packed: 2,
    preparing: 3,
  };
  packages.sort((a, b) => rank[a.status] - rank[b.status]);

  const unshipped: PackageItem[] = itemsKnown
    ? items
        .map(it => toPackageItem(it, null, remaining.get(it.id) ?? 0))
        .filter(p => p.quantity > 0)
    : [];

  return { packages, unshipped, itemsKnown };
}

export function packageStatusLabel(status: PackageStatus): string {
  switch (status) {
    case 'delivered':
      return 'Delivered';
    case 'shipped':
      return 'Shipped';
    case 'packed':
      return 'Packed';
    default:
      return 'Preparing';
  }
}

/**
 * One line for the order list, e.g. "1 of 3 packages delivered" or
 * "Shipping in 2 packages". Null when there's nothing worth saying (no
 * packages yet, or a single package — the order badge already covers it).
 */
export function packagesSummary(view: PackagesView | null): string | null {
  if (!view) return null;
  const total = view.packages.length + (view.unshipped.length ? 1 : 0);
  if (total <= 1) return null;
  const delivered = view.packages.filter(p => p.status === 'delivered').length;
  if (delivered > 0) return `${delivered} of ${total} packages delivered`;
  const shipped = view.packages.filter(p => p.status === 'shipped').length;
  if (shipped > 0) return `${shipped} of ${total} packages shipped`;
  return `Shipping in ${total} packages`;
}

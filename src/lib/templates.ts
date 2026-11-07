// Room templates — the same four the app shows on its Design → Templates tab.
// Bedroom pieces carry catalog SKUs and resolve to real products (price,
// product page, add to cart); living-room pieces are showcase-only for now,
// exactly like the app.
export type TemplatePiece = { id: string; name: string; price: number; image: string; sku?: string }
export type RoomTemplate = { id: string; name: string; style: 'Modern' | 'Traditional'; room: 'Bedroom' | 'Living Room'; image: string; furniture: TemplatePiece[] }

const T = '/images/templates'

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'bedroom-1', name: 'Modern Bedroom', style: 'Modern', room: 'Bedroom', image: `${T}/bedroom-1-template.jpg`,
    furniture: [
      { id: 'b1-1', sku: 'B01001005001M013OGADGRCWCPT', name: 'Bedside Bench', price: 349, image: `${T}/bedroom-1/bench.png` },
      { id: 'b1-2', sku: 'B01001005001W00YCZY357DS7L8', name: 'Bed', price: 1299, image: `${T}/bedroom-1/bed.png` },
      { id: 'b1-3', sku: 'C01001005001Y02VCKKUUE8KVLN', name: 'Sofa Chair', price: 549, image: `${T}/bedroom-1/sofa-chair.png` },
      { id: 'b1-4', sku: 'C01001007001N01JLCNN2L0DS2W', name: 'Wooden Stool', price: 129, image: `${T}/bedroom-1/stool.png` },
      { id: 'b1-5', sku: 'C02001001001X01O3LW993BZFET', name: 'Cabinet', price: 699, image: `${T}/bedroom-1/image.png` },
      { id: 'b1-6', sku: 'L01003005004Y01WT95QAT3QJHL', name: 'Table Lamp', price: 129, image: `${T}/bedroom-1/lamp.png` },
      { id: 'b1-7', sku: 'N01003005001L01E7ZJKCWEY79G', name: 'Nightstand', price: 279, image: `${T}/bedroom-1/nightstand.png` },
      { id: 'b1-8', name: 'Wall Art', price: 179, image: `${T}/bedroom-1/painting.png` },
      { id: 'b1-9', name: 'Decorative Vase', price: 89, image: `${T}/bedroom-1/vase.png` },
    ],
  },
  {
    id: 'bedroom-2', name: 'Classic Bedroom', style: 'Traditional', room: 'Bedroom', image: `${T}/bedroom-2-template.png`,
    furniture: [
      { id: 'b2-1', sku: 'B01001007001M01Y4H1EPEXBKBA', name: 'Bed', price: 1299, image: `${T}/bedroom-2/bed.png` },
      { id: 'b2-2', sku: 'C01001005002L021K2EE1PL1PMS', name: 'Accent Chair', price: 479, image: `${T}/bedroom-2/chair.png` },
      { id: 'b2-3', sku: 'C02001007001K01C5CCZO8UXHH8', name: 'Cabinet', price: 599, image: `${T}/bedroom-2/cabinet.png` },
      { id: 'b2-4', sku: 'L01002007007M044XH4878F6M4V', name: 'Table Lamp', price: 149, image: `${T}/bedroom-2/lamp.png` },
      { id: 'b2-5', sku: 'N01001007001M034T008EUCA7TG', name: 'Nightstand', price: 279, image: `${T}/bedroom-2/nightstand.jpg` },
      { id: 'b2-6', name: 'Wall Painting', price: 179, image: `${T}/bedroom-2/painting.png` },
    ],
  },
  {
    id: 'livingroom-1', name: 'Modern Living Room', style: 'Modern', room: 'Living Room', image: `${T}/living-room-1-template.png`,
    furniture: [
      { id: 'l1-1', name: 'Metal Stand Table', price: 249, image: `${T}/livingroom-1/desk.jpg` },
      { id: 'l1-2', name: 'Sofa', price: 1299, image: `${T}/livingroom-1/sofa.jpg` },
      { id: 'l1-3', name: 'Rocking Sofa Chair', price: 649, image: `${T}/livingroom-1/rockingchair.png` },
      { id: 'l1-4', name: 'Desk Lamp', price: 129, image: `${T}/livingroom-1/desklamp.png` },
      { id: 'l1-5', name: 'Standing Shelf', price: 449, image: `${T}/livingroom-1/bookshelf.png` },
      { id: 'l1-7', name: 'Floor Lamp', price: 199, image: `${T}/livingroom-1/floorlamp.jpg` },
      { id: 'l1-8', name: 'Desk Chair', price: 349, image: `${T}/livingroom-1/chair.jpg` },
    ],
  },
  {
    id: 'livingroom-2', name: 'Classic Living Room', style: 'Traditional', room: 'Living Room', image: `${T}/livingroom-2-template.jpg`,
    furniture: [
      { id: 'l2-1', name: 'Sofa', price: 1499, image: `${T}/livingroom-2/sofa.png` },
      { id: 'l2-2', name: 'Armchair', price: 599, image: `${T}/livingroom-2/chair.png` },
      { id: 'l2-3', name: 'Side Chair', price: 449, image: `${T}/livingroom-2/woodchair.png` },
      { id: 'l2-4', name: 'Coffee Table', price: 449, image: `${T}/livingroom-2/table.jpg` },
      { id: 'l2-5', name: 'Side Table', price: 249, image: `${T}/livingroom-2/tablestand.png` },
      { id: 'l2-7', name: 'Bookcase', price: 699, image: `${T}/livingroom-2/bookshelf.png` },
      { id: 'l2-8', name: 'Table Lamp', price: 149, image: `${T}/livingroom-2/tablelamp.png` },
      { id: 'l2-9', name: 'Floor Lamp', price: 199, image: `${T}/livingroom-2/floorlamp.png` },
    ],
  },
]

export const POPULAR_SEARCHES = ['modern sofa', 'dining table', 'office chair', 'scandinavian furniture', 'floor lamp', 'bookshelf']

// Store category tiles (same eight as the app); each runs a catalog search.
export const STORE_CATEGORIES = [
  { name: 'Sofas', q: 'sofa' }, { name: 'Tables', q: 'table' }, { name: 'Chairs', q: 'chair' }, { name: 'Storage', q: 'cabinet' },
  { name: 'Lighting', q: 'lamp' }, { name: 'Decor', q: 'decor' }, { name: 'Rugs', q: 'rug' }, { name: 'Outdoor', q: 'outdoor' },
]

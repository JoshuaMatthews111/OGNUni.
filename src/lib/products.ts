// Shared types + helpers for the OGN University store (digital products).

export type ProductType = 'audio_album' | 'bundle' | 'ebook' | 'video'

export interface Product {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  long_description: string | null
  product_type: ProductType
  price: number
  compare_at_price: number | null
  currency: string
  front_cover_url: string | null
  back_cover_url: string | null
  track_count: number
  duration_label: string | null
  is_bundle: boolean
  is_published: boolean
  sort_order: number
}

export interface ProductFile {
  id: string
  product_id: string
  title: string
  track_number: number | null
  bucket: string
  storage_path: string
  file_size: number | null
  mime_type: string | null
  duration_seconds: number | null
  is_preview: boolean
  order_index: number
}

export function formatPrice(amount: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  const mb = bytes / 1048576
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

/** Total download weight of a product, for the "what you get" line. */
export function totalSize(files: Pick<ProductFile, 'file_size'>[]) {
  return files.reduce((sum, f) => sum + (f.file_size || 0), 0)
}

/** Savings on a bundle vs buying the parts, or null when there is none. */
export function bundleSaving(product: Pick<Product, 'price' | 'compare_at_price'>) {
  if (!product.compare_at_price || product.compare_at_price <= product.price) return null
  return product.compare_at_price - product.price
}

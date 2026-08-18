'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Disc3, Download, Loader2, Library as LibraryIcon, CheckCircle2, Clock, PartyPopper,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatFileSize, type Product, type ProductFile } from '@/lib/products'

interface OwnedProduct extends Product {
  files: ProductFile[]
  purchasedAt: string
}

/** useSearchParams needs a Suspense boundary above it to prerender. */
export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f0f2f5] flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  )
}

function LibraryContent() {
  const supabase = createClient()
  const params = useSearchParams()
  const justPurchased = params.get('purchased')

  const [items, setItems] = useState<OwnedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  // Stripe's webhook can land a second or two after the redirect.
  const [waitingForFulfilment, setWaitingForFulfilment] = useState(false)

  useEffect(() => { load() }, [])

  const load = async (attempt = 0) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSignedIn(false); setLoading(false); return }

    const { data: purchases } = await supabase
      .from('product_purchases')
      .select('created_at, product:product_id(*)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    const products = (purchases || [])
      .map((p: any) => ({ ...p.product, purchasedAt: p.created_at }))
      .filter((p: any) => p?.id && !p.is_bundle) // bundles unlock the volumes; show the volumes

    // Fresh purchase that hasn't been fulfilled yet — poll briefly.
    if (justPurchased && products.length === 0 && attempt < 5) {
      setWaitingForFulfilment(true)
      setTimeout(() => load(attempt + 1), 2000)
      return
    }
    setWaitingForFulfilment(false)

    if (products.length) {
      const { data: files } = await supabase
        .from('product_files')
        .select('*')
        .in('product_id', products.map((p: any) => p.id))
        .order('order_index', { ascending: true })

      for (const p of products) {
        p.files = (files || []).filter((f: any) => f.product_id === p.id)
      }
    }

    setItems(products as OwnedProduct[])
    setLoading(false)
  }

  /** Ask the server for a signed URL, then trigger the browser download. */
  const downloadOne = async (file: ProductFile) => {
    setBusy(file.id)
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Download failed')

      const dl = data.downloads[0]
      const a = document.createElement('a')
      a.href = dl.url
      a.download = dl.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err: any) {
      toast.error(err.message || 'Could not start the download')
    } finally {
      setBusy(null)
    }
  }

  /** Downloads every track in a product, staggered so the browser keeps up. */
  const downloadAll = async (product: OwnedProduct) => {
    setBusy(product.id)
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Download failed')

      toast.success(`Starting ${data.downloads.length} downloads`, {
        description: 'Your browser may ask permission to download multiple files.',
      })

      for (const [i, dl] of data.downloads.entries()) {
        setTimeout(() => {
          const a = document.createElement('a')
          a.href = dl.url
          a.download = dl.filename
          document.body.appendChild(a)
          a.click()
          a.remove()
        }, i * 800)
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not start the downloads')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
        {waitingForFulfilment && (
          <p className="text-sm text-gray-500">Confirming your payment with Stripe…</p>
        )}
      </div>
    )
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col justify-center items-center px-6 text-center">
        <LibraryIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-[#0a1628] mb-2">Sign in to see your library</h1>
        <p className="text-gray-500 mb-6">Everything you purchase is saved to your account.</p>
        <Link href="/"><Button className="bg-[#0a1628] text-[#c9a227]">Sign in</Button></Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#0a1628] text-white py-10">
        <div className="container mx-auto px-6">
          <p className="text-xs tracking-[4px] text-[#c9a227] font-bold mb-2">YOUR LIBRARY</p>
          <h1 className="text-3xl md:text-4xl font-bold">Downloads &amp; Purchases</h1>
          <p className="text-gray-300 mt-2">
            Yours to keep. Re-download any track, on any device, as often as you like.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        {justPurchased && items.length > 0 && (
          <Card className="p-5 mb-8 border-2 border-green-500 bg-green-50 flex items-start gap-3">
            <PartyPopper className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-900">Thank you — your purchase is complete.</p>
              <p className="text-sm text-green-800">
                Everything you bought is below. Use <strong>Download all tracks</strong> to get the whole volume.
              </p>
            </div>
          </Card>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">Your library is empty</h3>
            <p className="text-gray-500 mb-6">Teaching series you purchase will appear here.</p>
            <Link href="/store">
              <Button className="bg-[#0a1628] hover:bg-[#1a3a5c] text-[#c9a227] font-semibold">Browse the store</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {items.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="grid md:grid-cols-[200px_1fr] gap-0">
                  <div className="bg-[#0a1628] p-5 flex items-start justify-center">
                    {product.front_cover_url ? (
                      <img src={product.front_cover_url} alt={product.title} className="w-full aspect-square object-cover rounded-lg shadow-xl" />
                    ) : (
                      <Disc3 className="w-16 h-16 text-[#c9a227]" />
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <Badge className="bg-green-600 hover:bg-green-600 mb-2">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> OWNED
                        </Badge>
                        <h2 className="text-xl font-bold text-[#0a1628] leading-snug">{product.title}</h2>
                        {product.subtitle && <p className="text-[#c9a227] font-medium text-sm">{product.subtitle}</p>}
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Purchased {new Date(product.purchasedAt).toLocaleDateString()}
                          {product.files?.length > 0 && ` · ${formatFileSize(product.files.reduce((s, f) => s + (f.file_size || 0), 0))}`}
                        </p>
                      </div>

                      <Button
                        onClick={() => downloadAll(product)}
                        disabled={busy === product.id || !product.files?.length}
                        className="bg-[#0a1628] hover:bg-[#1a3a5c] text-[#c9a227] font-semibold shrink-0"
                      >
                        {busy === product.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing…</>
                        ) : (
                          <><Download className="w-4 h-4 mr-2" /> Download all tracks</>
                        )}
                      </Button>
                    </div>

                    {product.files?.length > 0 && (
                      <div className="divide-y border-t">
                        {product.files.map((file) => (
                          <div key={file.id} className="flex items-center gap-3 py-2.5">
                            <span className="text-xs text-gray-400 w-6 tabular-nums shrink-0">{file.track_number ?? '–'}</span>
                            <span className="text-sm text-gray-700 flex-1 leading-snug">{file.title}</span>
                            <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{formatFileSize(file.file_size)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadOne(file)}
                              disabled={busy === file.id}
                              className="text-[#c9a227] hover:text-[#0a1628] hover:bg-[#c9a227]/10 shrink-0"
                            >
                              {busy === file.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Download className="w-4 h-4" />}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

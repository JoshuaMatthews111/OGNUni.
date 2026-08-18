'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Disc3, Download, Clock, ShieldCheck, Headphones, Loader2,
  Library, ArrowLeft, Play, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice, formatFileSize, bundleSaving, totalSize, type Product, type ProductFile } from '@/lib/products'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [product, setProduct] = useState<Product | null>(null)
  const [files, setFiles] = useState<ProductFile[]>([])
  const [includes, setIncludes] = useState<Product[]>([])
  const [owned, setOwned] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)

  useEffect(() => { if (slug) load() }, [slug])

  const load = async () => {
    const { data: prod } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()

    if (!prod) { setLoading(false); return }
    setProduct(prod as Product)

    // A bundle's tracklist is the tracklists of what it contains.
    if (prod.is_bundle) {
      const { data: items } = await supabase
        .from('bundle_items')
        .select('product:product_id(*)')
        .eq('bundle_id', prod.id)

      const contained = (items || []).map((i: any) => i.product).filter(Boolean) as Product[]
      contained.sort((a, b) => a.sort_order - b.sort_order)
      setIncludes(contained)

      if (contained.length) {
        const { data: allFiles } = await supabase
          .from('product_files')
          .select('*')
          .in('product_id', contained.map((c) => c.id))
          .order('order_index', { ascending: true })
        setFiles((allFiles as ProductFile[]) || [])
      }
    } else {
      const { data: prodFiles } = await supabase
        .from('product_files')
        .select('*')
        .eq('product_id', prod.id)
        .order('order_index', { ascending: true })
      setFiles((prodFiles as ProductFile[]) || [])
    }

    const { data: { user } } = await supabase.auth.getUser()
    setSignedIn(!!user)
    if (user) {
      const { data: purchase } = await supabase
        .from('product_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', prod.id)
        .eq('status', 'completed')
        .maybeSingle()
      setOwned(!!purchase)
    }

    setLoading(false)
  }

  const buy = async () => {
    if (!signedIn) {
      toast.error('Please sign in first', { description: 'Your downloads are saved to your account.' })
      router.push('/?signin=1')
      return
    }

    setBuying(true)
    try {
      const res = await fetch('/api/checkout/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product!.id }),
      })
      const data = await res.json()

      if (data.alreadyOwned) {
        router.push('/library')
        return
      }
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message || 'Could not start checkout')
      setBuying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col justify-center items-center px-6 text-center">
        <Disc3 className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-[#0a1628] mb-2">This product isn&apos;t available</h1>
        <p className="text-gray-500 mb-6">It may have been unpublished or the link is wrong.</p>
        <Link href="/store"><Button className="bg-[#0a1628] text-[#c9a227]">Back to the store</Button></Link>
      </div>
    )
  }

  const saving = bundleSaving(product)
  const downloadWeight = totalSize(files)
  const trackCount = product.track_count || files.length

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#0a1628] text-white">
        <div className="container mx-auto px-6 py-5">
          <Link href="/store" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#c9a227]">
            <ArrowLeft className="w-4 h-4" /> Store
          </Link>
        </div>

        <div className="container mx-auto px-6 pb-12 grid md:grid-cols-[minmax(0,380px)_1fr] gap-10 items-start">
          {/* Covers — front, with the back available as a second view */}
          <div>
            <Tabs defaultValue="front">
              <div className="rounded-xl overflow-hidden shadow-2xl bg-[#0f2341] aspect-square">
                <TabsContent value="front" className="m-0 h-full">
                  {product.front_cover_url ? (
                    <img src={product.front_cover_url} alt={`${product.title} front cover`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Disc3 className="w-20 h-20 text-[#c9a227]" /></div>
                  )}
                </TabsContent>
                <TabsContent value="back" className="m-0 h-full">
                  {product.back_cover_url ? (
                    <img src={product.back_cover_url} alt={`${product.title} back cover`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No back cover</div>
                  )}
                </TabsContent>
              </div>

              {product.back_cover_url && (
                <TabsList className="mt-4 bg-white/10 w-full">
                  <TabsTrigger value="front" className="flex-1 data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#0a1628]">Front cover</TabsTrigger>
                  <TabsTrigger value="back" className="flex-1 data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#0a1628]">Back cover</TabsTrigger>
                </TabsList>
              )}
            </Tabs>
          </div>

          {/* Details + buy */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {product.is_bundle && (
                <Badge className="bg-[#c9a227] text-[#0a1628] hover:bg-[#c9a227]">
                  {saving ? 'BEST VALUE — BOTH VOLUMES' : 'COMPLETE SERIES — BOTH VOLUMES'}
                </Badge>
              )}
              {saving && <Badge variant="outline" className="border-[#c9a227] text-[#c9a227]">Save {formatPrice(saving, product.currency)}</Badge>}
              {owned && <Badge className="bg-green-600 hover:bg-green-600">YOU OWN THIS</Badge>}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{product.title}</h1>
            {product.subtitle && <p className="text-xl text-[#c9a227] font-medium mb-5">{product.subtitle}</p>}
            <p className="text-sm text-gray-400 mb-6">Joshua Matthews · Overcomers Global Network</p>

            {product.description && <p className="text-gray-300 leading-relaxed mb-6">{product.description}</p>}

            <div className="flex flex-wrap gap-6 text-sm text-gray-300 mb-8">
              {trackCount > 0 && <span className="flex items-center gap-2"><Disc3 className="w-4 h-4 text-[#c9a227]" /> {trackCount} tracks</span>}
              {product.duration_label && <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#c9a227]" /> {product.duration_label}</span>}
              <span className="flex items-center gap-2"><Headphones className="w-4 h-4 text-[#c9a227]" /> 320 kbps MP3</span>
              {downloadWeight > 0 && <span className="flex items-center gap-2"><Download className="w-4 h-4 text-[#c9a227]" /> {formatFileSize(downloadWeight)}</span>}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-4xl font-bold">{formatPrice(product.price, product.currency)}</span>
                {product.compare_at_price && (
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.compare_at_price, product.currency)}</span>
                )}
              </div>

              {owned ? (
                <Link href="/library">
                  <Button size="lg" className="w-full bg-[#c9a227] hover:bg-[#d4af37] text-[#0a1628] font-bold">
                    <Library className="w-5 h-5 mr-2" /> Go to your library
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={buy}
                  disabled={buying}
                  className="w-full bg-[#c9a227] hover:bg-[#d4af37] text-[#0a1628] font-bold"
                >
                  {buying ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Opening secure checkout…</>
                  ) : (
                    <><Download className="w-5 h-5 mr-2" /> Buy &amp; download — {formatPrice(product.price, product.currency)}</>
                  )}
                </Button>
              )}

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4" /> Secure payment by Stripe · instant download · yours forever
              </div>
            </div>

            {/* What a bundle contains */}
            {includes.length > 0 && (
              <div className="mt-8">
                <p className="text-xs tracking-[3px] text-[#c9a227] font-bold mb-3">WHAT&apos;S INCLUDED</p>
                <div className="space-y-2">
                  {includes.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#c9a227] shrink-0" />
                      <span className="font-medium">{item.title}</span>
                      {item.subtitle && <span className="text-gray-500">— {item.subtitle}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Long description + tracklist */}
      <div className="container mx-auto px-6 py-12 grid lg:grid-cols-[1fr_minmax(0,420px)] gap-10 items-start">
        <div>
          {product.long_description && (
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-bold text-[#0a1628] mb-4">About this series</h2>
              <div className="prose prose-slate max-w-none text-gray-600 whitespace-pre-line leading-relaxed">
                {product.long_description}
              </div>
            </Card>
          )}

          <Card className="p-8">
            <h2 className="text-2xl font-bold text-[#0a1628] mb-2">How the download works</h2>
            <ol className="text-gray-600 space-y-3 mt-4 list-decimal list-inside">
              <li>Pay securely through Stripe — card details never touch this site.</li>
              <li>You land straight in your library, where every track is listed.</li>
              <li>Download tracks one at a time or all at once, on any device.</li>
              <li>Your library never expires — come back and re-download whenever you want.</li>
            </ol>
          </Card>
        </div>

        {/* Tracklist */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#0a1628]">Tracklist</h2>
            <span className="text-sm text-gray-400">{files.length} tracks</span>
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-gray-500">Tracklist coming soon.</p>
          ) : (
            <div className="divide-y">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-xs text-gray-400 w-6 tabular-nums shrink-0">
                    {file.track_number ?? '–'}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 leading-snug">{file.title}</span>
                  {file.is_preview && (
                    <Badge variant="outline" className="text-[10px] border-[#c9a227] text-[#c9a227] shrink-0">
                      <Play className="w-2.5 h-2.5 mr-1" /> SAMPLE
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

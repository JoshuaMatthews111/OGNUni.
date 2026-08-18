'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Disc3, Download, Headphones, Clock, ShieldCheck, Library } from 'lucide-react'
import { formatPrice, bundleSaving, type Product } from '@/lib/products'

export default function StorePage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    setProducts((data as Product[]) || [])

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: purchases } = await supabase
        .from('product_purchases')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
      setOwned(new Set((purchases || []).map((p) => p.product_id)))
    }

    setLoading(false)
  }

  const bundles = products.filter((p) => p.is_bundle)
  const singles = products.filter((p) => !p.is_bundle)

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Hero */}
      <div className="bg-[#0a1628] text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <Image
            src="/assets/ogn-university-logo-transparent.png"
            alt="OGN University"
            width={100}
            height={80}
            className="mx-auto mb-4 object-contain"
          />
          <p className="text-xs tracking-[4px] text-[#c9a227] font-bold mb-3">OGN UNIVERSITY STORE</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Teaching You Can Take With You</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Audio teaching series from Prophet Joshua Matthews. Buy once, download forever —
            every track is yours to keep on any device.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-300">
            <span className="flex items-center gap-2"><Download className="w-4 h-4 text-[#c9a227]" /> Instant download</span>
            <span className="flex items-center gap-2"><Headphones className="w-4 h-4 text-[#c9a227]" /> 320 kbps MP3</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#c9a227]" /> Secure Stripe checkout</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#c9a227] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">Nothing in the store yet</h3>
            <p className="text-gray-500">New teaching series are on the way.</p>
          </div>
        ) : (
          <>
            {/* Bundles first — the offer we want people to take */}
            {bundles.map((bundle) => {
              const saving = bundleSaving(bundle)
              const isOwned = owned.has(bundle.id)
              return (
                <Card key={bundle.id} className="overflow-hidden mb-12 border-2 border-[#c9a227]">
                  <div className="grid md:grid-cols-[320px_1fr] gap-0">
                    <div className="relative bg-[#0a1628] p-6 flex items-center justify-center">
                      {bundle.front_cover_url ? (
                        <img
                          src={bundle.front_cover_url}
                          alt={bundle.title}
                          className="w-full max-w-[260px] aspect-square object-cover rounded-lg shadow-2xl"
                        />
                      ) : (
                        <Disc3 className="w-24 h-24 text-[#c9a227]" />
                      )}
                    </div>

                    <div className="p-8">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-[#c9a227] text-[#0a1628] hover:bg-[#c9a227]">
                          {saving ? 'BEST VALUE' : 'COMPLETE SERIES'}
                        </Badge>
                        {saving && (
                          <Badge variant="outline" className="border-[#c9a227] text-[#c9a227]">
                            Save {formatPrice(saving, bundle.currency)}
                          </Badge>
                        )}
                      </div>

                      <h2 className="text-2xl md:text-3xl font-bold text-[#0a1628] mb-2">{bundle.title}</h2>
                      {bundle.subtitle && <p className="text-[#c9a227] font-medium mb-4">{bundle.subtitle}</p>}
                      {bundle.description && <p className="text-gray-600 mb-6">{bundle.description}</p>}

                      <div className="flex flex-wrap gap-5 text-sm text-gray-500 mb-6">
                        {bundle.track_count > 0 && (
                          <span className="flex items-center gap-2"><Disc3 className="w-4 h-4" /> {bundle.track_count} tracks</span>
                        )}
                        {bundle.duration_label && (
                          <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {bundle.duration_label}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-[#0a1628]">
                            {formatPrice(bundle.price, bundle.currency)}
                          </span>
                          {bundle.compare_at_price && (
                            <span className="text-lg text-gray-400 line-through">
                              {formatPrice(bundle.compare_at_price, bundle.currency)}
                            </span>
                          )}
                        </div>

                        {isOwned ? (
                          <Link href="/library">
                            <Button size="lg" variant="outline" className="border-[#0a1628] text-[#0a1628]">
                              <Library className="w-4 h-4 mr-2" /> In your library
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/store/${bundle.slug}`}>
                            <Button size="lg" className="bg-[#0a1628] hover:bg-[#1a3a5c] text-[#c9a227] font-semibold">
                              Get both volumes
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* Individual volumes */}
            {singles.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-[#0a1628] mb-6">Individual Volumes</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {singles.map((product) => {
                    const isOwned = owned.has(product.id)
                    return (
                      <Link key={product.id} href={`/store/${product.slug}`}>
                        <Card className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group h-full flex flex-col">
                          <div className="relative aspect-square bg-[#0a1628]">
                            {product.front_cover_url ? (
                              <img
                                src={product.front_cover_url}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Disc3 className="w-16 h-16 text-[#c9a227]" />
                              </div>
                            )}
                            {isOwned && (
                              <Badge className="absolute top-3 right-3 bg-green-600 hover:bg-green-600">OWNED</Badge>
                            )}
                          </div>

                          <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-bold text-[#0a1628] mb-1 leading-snug">{product.title}</h3>
                            {product.subtitle && (
                              <p className="text-sm text-[#c9a227] font-medium mb-3">{product.subtitle}</p>
                            )}

                            <div className="flex gap-4 text-xs text-gray-500 mb-4">
                              {product.track_count > 0 && <span>{product.track_count} tracks</span>}
                              {product.duration_label && <span>{product.duration_label}</span>}
                            </div>

                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-2xl font-bold text-[#0a1628]">
                                {formatPrice(product.price, product.currency)}
                              </span>
                              <span className="text-sm font-semibold text-[#c9a227] group-hover:underline">
                                {isOwned ? 'Download →' : 'View details →'}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

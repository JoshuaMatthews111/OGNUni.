import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * POST /api/checkout/product  { productId }
 *
 * Creates a Stripe Checkout session for a digital product (single album or a
 * bundle). Fulfilment happens in /api/webhooks/stripe — never here — so a
 * closed browser tab can't cost someone their purchase.
 */
export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, slug, title, subtitle, price, currency, front_cover_url, is_published, is_bundle')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (!product.is_published) {
      return NextResponse.json({ error: 'Product is not available' }, { status: 400 })
    }
    if (!product.price || product.price <= 0) {
      return NextResponse.json({ error: 'Product has no price set' }, { status: 400 })
    }

    // Already owned? Send them to the library instead of charging twice.
    const { data: owned } = await supabase
      .from('product_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle()

    if (owned) {
      return NextResponse.json(
        { error: 'You already own this — it is in your library.', alreadyOwned: true },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ognuniversity.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency || 'usd',
            product_data: {
              name: product.title,
              description: product.subtitle || 'Digital audio teaching — instant download',
              ...(product.front_cover_url ? { images: [product.front_cover_url] } : {}),
            },
            unit_amount: Math.round(Number(product.price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/library?purchased=${product.slug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/store/${product.slug}`,
      customer_email: profile?.email || user.email,
      client_reference_id: user.id,
      metadata: {
        type: 'product_purchase',
        productId: product.id,
        userId: user.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Product checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

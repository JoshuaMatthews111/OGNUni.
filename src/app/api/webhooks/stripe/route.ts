import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Use service role key for webhook (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata

  if (!metadata || !metadata.userId) {
    console.error('Missing metadata in checkout session')
    return
  }

  if (metadata.type === 'course_purchase') {
    // Create course enrollment
    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: metadata.userId,
        course_id: metadata.courseId,
        enrollment_type: 'purchase',
        stripe_payment_intent_id: session.payment_intent as string,
      })

    if (error) {
      console.error('Error creating enrollment:', error)
    } else {
      // Record payment
      await supabase.from('payments').insert({
        user_id: metadata.userId,
        course_id: metadata.courseId,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || 'usd',
        status: 'completed',
        payment_type: 'course_purchase',
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
      })
    }
  } else if (metadata.type === 'membership' || metadata.type === 'mentoring') {
    // Subscription will be handled by subscription webhooks
    console.log('Subscription checkout completed, waiting for subscription webhook')
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata

  if (!metadata || !metadata.userId) {
    console.error('Missing metadata in subscription')
    return
  }

  const subscriptionType = metadata.type as 'membership' | 'mentoring'

  // Upsert subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: metadata.userId,
      subscription_type: subscriptionType,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (error) {
    console.error('Error updating subscription:', error)
    return
  }

  // If membership, auto-enroll in membership courses
  if (subscriptionType === 'membership' && subscription.status === 'active') {
    await enrollInMembershipCourses(metadata.userId)
  }

  // Send notification
  if (subscription.status === 'active') {
    await supabase.rpc('create_notification', {
      p_user_id: metadata.userId,
      p_type: 'subscription_active',
      p_title: `${subscriptionType === 'membership' ? 'Membership' : 'Mentoring'} Active`,
      p_content: 'Your subscription is now active!',
      p_link: '/dashboard'
    })
  }
}

async function enrollInMembershipCourses(userId: string) {
  // Get all membership courses
  const { data: membershipCourses } = await supabase
    .from('membership_courses')
    .select('course_id')

  if (!membershipCourses || membershipCourses.length === 0) return

  // Check which courses user is not enrolled in
  const { data: existingEnrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', userId)

  const enrolledCourseIds = new Set(existingEnrollments?.map(e => e.course_id) || [])

  // Enroll in new courses
  const newEnrollments = membershipCourses
    .filter(mc => !enrolledCourseIds.has(mc.course_id))
    .map(mc => ({
      user_id: userId,
      course_id: mc.course_id,
      enrollment_type: 'membership',
    }))

  if (newEnrollments.length > 0) {
    await supabase
      .from('enrollments')
      .insert(newEnrollments)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)

  // Optionally: Revoke access to membership courses
  // (or let them keep access until period ends based on business rules)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = (invoice as any).subscription
  if (!subId) return

  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subId as string)

  // Send notification to user
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subId as string)
    .single()

  if (subscription) {
    await supabase.rpc('create_notification', {
      p_user_id: subscription.user_id,
      p_type: 'payment_failed',
      p_title: 'Payment Failed',
      p_content: 'Your subscription payment failed. Please update your payment method.',
      p_link: '/settings/billing'
    })
  }
}

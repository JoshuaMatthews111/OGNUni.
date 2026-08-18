import { NextResponse } from 'next/server'

// Demo mode has been disabled. This endpoint is no longer functional.
export async function POST() {
  return NextResponse.json(
    { error: 'Demo mode is disabled. Please register for a real account.' },
    { status: 410 }
  )
}

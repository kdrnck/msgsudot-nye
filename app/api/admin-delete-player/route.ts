import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminPassword = process.env.ADMIN_PASSWORD

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server credentials are not configured')
}

const adminClient = createClient(supabaseUrl, serviceRoleKey)

export async function DELETE(request: Request) {
    if (!adminPassword) {
        return NextResponse.json({ success: false, error: 'Admin password not configured' }, { status: 500 })
    }

    const adminSecret = request.headers.get('x-admin-secret')
    if (adminSecret !== adminPassword) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('id')

    if (!playerId) {
        return NextResponse.json({ success: false, error: 'Player ID is required' }, { status: 400 })
    }

    const { error } = await adminClient.from('players').delete().eq('id', playerId)

    if (error) {
        console.error('Error deleting player:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
}

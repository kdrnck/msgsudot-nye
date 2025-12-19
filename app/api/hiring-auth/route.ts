import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { password } = body

        if (password === process.env.HIRING_ADMIN_PASSWORD) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false }, { status: 401 })
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}

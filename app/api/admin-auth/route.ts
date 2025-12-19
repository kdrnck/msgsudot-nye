
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const body = await request.json()
    const { password } = body

    const adminPassword = process.env.ADMIN_PASSWORD

    if (password === adminPassword) {
        return NextResponse.json({ success: true })
    } else {
        return NextResponse.json({ success: false }, { status: 401 })
    }
}

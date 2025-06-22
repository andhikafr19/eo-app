import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/test-qr - Get sample QR data for testing
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // Get confirmed registrations with tickets
    const registrations = await prisma.registration.findMany({
      where: {
        status: 'CONFIRMED',
        ...(eventId && { eventId })
      },
      include: {
        ticket: {
          select: {
            qrCodeData: true,
            ticketNumber: true
          }
        },
        event: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      take: 10
    })

    const sampleData = registrations.map(reg => ({
      registrationId: reg.id,
      eventId: reg.eventId,
      userId: reg.userId,
      eventName: reg.event.name,
      userName: reg.user.name || reg.user.email,
      ticketNumber: reg.ticket?.ticketNumber,
      qrData: reg.ticket?.qrCodeData,
      // Generate sample formats
      formats: {
        json: JSON.stringify({
          registrationId: reg.id,
          eventId: reg.eventId,
          userId: reg.userId,
          timestamp: new Date().toISOString()
        }),
        url: `http://localhost:3000/ticket?registrationId=${reg.id}&eventId=${reg.eventId}&userId=${reg.userId}`,
        simple: reg.id
      }
    }))

    return NextResponse.json({
      success: true,
      count: sampleData.length,
      data: sampleData
    })

  } catch (error) {
    console.error('Test QR data fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

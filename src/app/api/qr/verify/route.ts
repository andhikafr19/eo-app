import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyQRCodeData } from '@/lib/qr-utils'

// POST /api/qr/verify - Verify QR code and get ticket info
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN and EVENT_ORGANIZER can verify QR codes
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_ORGANIZER') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to verify QR codes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { qrCodeData } = body

    if (!qrCodeData) {
      return NextResponse.json(
        { error: 'QR code data is required' },
        { status: 400 }
      )
    }

    // Verify QR code integrity
    const verification = verifyQRCodeData(qrCodeData)
    
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid QR code' },
        { status: 400 }
      )
    }

    const qrData = verification.data!

    // Find ticket by registration ID
    const ticket = await prisma.ticket.findFirst({
      where: {
        registrationId: qrData.registrationId
      },
      include: {
        registration: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                description: true,
                startDate: true,
                endDate: true,
                location: true,
                status: true,
                createdById: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Verify QR data matches ticket
    if (ticket.registration.eventId !== qrData.eventId || 
        ticket.registration.userId !== qrData.userId) {
      return NextResponse.json(
        { error: 'QR code does not match ticket data' },
        { status: 400 }
      )
    }

    // Check if event organizer can only verify their own events
    if (session.user.role === 'EVENT_ORGANIZER' && 
        ticket.registration.event.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only verify tickets for your own events' },
        { status: 403 }
      )
    }

    // Check if event is active
    const now = new Date()
    const eventStart = new Date(ticket.registration.event.startDate)
    const eventEnd = new Date(ticket.registration.event.endDate)

    if (now < eventStart) {
      return NextResponse.json(
        { 
          error: 'Event has not started yet',
          eventStart: eventStart.toISOString()
        },
        { status: 400 }
      )
    }

    if (now > eventEnd) {
      return NextResponse.json(
        { 
          error: 'Event has already ended',
          eventEnd: eventEnd.toISOString()
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        isUsed: ticket.isUsed,
        usedAt: ticket.usedAt,
        registration: {
          id: ticket.registration.id,
          status: ticket.registration.status,
          category: ticket.registration.category,
          user: ticket.registration.user,
          event: ticket.registration.event
        }
      }
    })
  } catch (error) {
    console.error('Error verifying QR code:', error)
    return NextResponse.json(
      { error: 'Failed to verify QR code' },
      { status: 500 }
    )
  }
}

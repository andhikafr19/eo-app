import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {  try {
    // Get a sample ticket with valid QR data
    const ticket = await prisma.ticket.findFirst({
      where: {
        isUsed: false  // Get unused ticket
      },
      include: {
        registration: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            event: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ 
        error: 'No tickets found',
        message: 'Please create an event and registration first'
      })
    }    return NextResponse.json({
      message: 'Sample QR Code Data for Testing',
      qrData: ticket.qrCodeData,
      registrationId: ticket.registrationId,
      ticketNumber: ticket.ticketNumber,
      userName: ticket.registration.user.name,
      eventName: ticket.registration.event.name,
      instructions: [
        'Copy the qrData value above',
        'Paste it into the QR Scanner manual input field',
        'Click "Scan" to test attendance scanning'
      ],
      debug: {
        ticketId: ticket.id,
        isUsed: ticket.isUsed,
        usedAt: ticket.usedAt
      }
    })
  } catch (error) {
    console.error('Error fetching sample QR:', error)
    return NextResponse.json({ error: 'Failed to fetch sample QR' }, { status: 500 })
  }
}

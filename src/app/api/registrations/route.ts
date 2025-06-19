import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  RegistrationStatus, 
  ParticipantCategory,
  type RegistrationStatusType,
  isValidRegistrationStatus,
  isValidParticipantCategory
} from '@/lib/types'
import { generateTicket } from '@/lib/qr-utils'

// GET /api/registrations - Get user's registrations or all registrations (admin)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const userId = searchParams.get('userId')
    const statusParam = searchParams.get('status')    // Validate status parameter
    const status = statusParam && isValidRegistrationStatus(statusParam) 
      ? statusParam 
      : undefined

    // Build query filters with proper typing
    const where: {
      userId?: string
      eventId?: string
      status?: RegistrationStatusType
      event?: { createdById: string }
    } = {}
    
    // Admin can see all registrations, users can only see their own
    if (session.user.role === 'ADMIN' || session.user.role === 'EVENT_ORGANIZER') {
      if (userId) where.userId = userId
      if (session.user.role === 'EVENT_ORGANIZER') {
        // Event organizers can only see registrations for their events
        where.event = {
          createdById: session.user.id
        }
      }    
    } else {
      where.userId = session.user.id
    }
    
    if (eventId) where.eventId = eventId
    if (status) where.status = status

    const registrations = await prisma.registration.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true,
            status: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            qrCode: true,
            isUsed: true,
            usedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(registrations)
  } catch (error) {
    console.error('Error fetching registrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    )
  }
}

// POST /api/registrations - Create new registration
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { eventId, category = 'PUBLIC', customFields } = body

    // Validation
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }    // Validate category
    const validCategory = isValidParticipantCategory(category) 
      ? category
      : ParticipantCategory.PUBLIC

    // Check if event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (event.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Event is not available for registration' },
        { status: 400 }
      )
    }

    // Check if event is full
    if (event.maxCapacity && event._count.registrations >= event.maxCapacity) {
      return NextResponse.json(
        { error: 'Event is full' },
        { status: 400 }
      )
    }

    // Check if user is already registered
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'You are already registered for this event' },
        { status: 400 }
      )
    }    // Create registration with ticket generation
    const registration = await prisma.registration.create({
      data: {
        eventId,
        userId: session.user.id,
        category: validCategory,
        customFields,
        status: RegistrationStatus.CONFIRMED // Auto-confirm for now
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true
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
    })

    // Generate ticket for the registration
    try {
      const ticketData = await generateTicket(registration.id, eventId, session.user.id)
      
      const ticket = await prisma.ticket.create({
        data: {
          registrationId: registration.id,
          ticketNumber: ticketData.ticketNumber,
          qrCode: ticketData.qrCode,
          qrCodeData: ticketData.qrCodeData
        }
      })

      // Return registration with ticket info
      return NextResponse.json({
        ...registration,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          qrCode: ticket.qrCode,
          isUsed: ticket.isUsed,
          usedAt: ticket.usedAt,
          createdAt: ticket.createdAt
        }
      }, { status: 201 })
    } catch (ticketError) {
      console.error('Error generating ticket:', ticketError)
      // Registration was successful, but ticket generation failed
      // Return registration without ticket info
      return NextResponse.json({
        ...registration,
        ticketError: 'Ticket generation failed, but registration was successful'
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating registration:', error)
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tickets/[id] - Get ticket details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
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
    }    // Check access permissions
    const canAccess = 
      session.user.role === 'ADMIN' ||
      ticket.registration.userId === session.user.id ||
      (session.user.role === 'EVENT_ORGANIZER' && ticket.registration.event.createdById === session.user.id)

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// PUT /api/tickets/[id] - Mark ticket as used (for check-in)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only ADMIN and EVENT_ORGANIZER can mark tickets as used
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_ORGANIZER') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to check-in tickets' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action !== 'check-in') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    // Check if ticket exists and belongs to organizer's event (if not admin)
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        registration: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                createdById: true
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

    // Check if event organizer can only check-in their own events
    if (session.user.role === 'EVENT_ORGANIZER' && 
        ticket.registration.event.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only check-in tickets for your own events' },
        { status: 403 }
      )
    }

    // Check if ticket is already used
    if (ticket.isUsed) {
      return NextResponse.json(
        { error: 'Ticket has already been used' },
        { status: 400 }
      )
    }

    // Mark ticket as used
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        isUsed: true,
        usedAt: new Date()
      },
      include: {
        registration: {
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
        }
      }
    })

    return NextResponse.json({
      message: 'Ticket checked in successfully',
      ticket: updatedTicket
    })
  } catch (error) {
    console.error('Error checking in ticket:', error)
    return NextResponse.json(
      { error: 'Failed to check in ticket' },
      { status: 500 }
    )
  }
}

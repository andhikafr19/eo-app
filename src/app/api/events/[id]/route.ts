import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/events/[id] - Get single event
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('GET /api/events/[id] called with ID:', params.id)
    
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        registrations: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        sessions: true,        _count: {
          select: { registrations: true }
        }
      }
    })

    if (!event) {
      console.log('Event not found for ID:', params.id)
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    console.log('Event found:', event.name)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id] - Update event
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

    // Check if user has permission to edit events
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_ORGANIZER') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit events' },
        { status: 403 }
      )
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: params.id }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Allow ADMIN to edit any event, EVENT_ORGANIZER can only edit their own
    if (session.user.role === 'EVENT_ORGANIZER' && existingEvent.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own events' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, startDate, endDate, location, maxCapacity, status } = body

    // Validation
    if (!name || !startDate || !endDate || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    const updatedEvent = await prisma.event.update({
      where: { id: params.id },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        status: status || existingEvent.status
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(
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

    // Check if user has permission to delete events
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_ORGANIZER') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete events' },
        { status: 403 }
      )
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Allow ADMIN to delete any event, EVENT_ORGANIZER can only delete their own
    if (session.user.role === 'EVENT_ORGANIZER' && existingEvent.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own events' },
        { status: 403 }
      )
    }

    // Check if event has registrations
    if (existingEvent._count.registrations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event with existing registrations' },
        { status: 400 }
      )
    }

    await prisma.event.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}

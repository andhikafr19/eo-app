import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/registrations/[id] - Get single registration
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

    const registration = await prisma.registration.findUnique({
      where: { id: params.id },
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
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        attendances: {
          include: {
            session: {
              select: {
                id: true,
                name: true,
                startTime: true,
                endTime: true
              }
            }
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const canAccess = 
      session.user.role === 'ADMIN' ||
      registration.userId === session.user.id ||
      (session.user.role === 'EVENT_ORGANIZER' && registration.event.createdBy.id === session.user.id)

    if (!canAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(registration)
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}

// PUT /api/registrations/[id] - Update registration status
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

    const body = await request.json()
    const { status, category, customFields } = body

    // Check if registration exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { id: params.id },
      include: {
        event: {
          select: {
            createdBy: { select: { id: true } }
          }
        }
      }
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canUpdate = 
      session.user.role === 'ADMIN' ||
      existingRegistration.userId === session.user.id ||
      (session.user.role === 'EVENT_ORGANIZER' && existingRegistration.event.createdBy.id === session.user.id)

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Regular users can only cancel their own registrations
    if (existingRegistration.userId === session.user.id && 
        session.user.role === 'USER' && 
        status && status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Users can only cancel their registrations' },
        { status: 403 }
      )
    }

    // Update registration
    const updatedRegistration = await prisma.registration.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(category && { category }),
        ...(customFields && { customFields })
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

    return NextResponse.json(updatedRegistration)
  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json(
      { error: 'Failed to update registration' },
      { status: 500 }
    )
  }
}

// DELETE /api/registrations/[id] - Delete registration
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

    // Check if registration exists
    const existingRegistration = await prisma.registration.findUnique({
      where: { id: params.id },
      include: {
        event: {
          select: {
            createdBy: { select: { id: true } }
          }
        }
      }
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const canDelete = 
      session.user.role === 'ADMIN' ||
      existingRegistration.userId === session.user.id ||
      (session.user.role === 'EVENT_ORGANIZER' && existingRegistration.event.createdBy.id === session.user.id)

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    await prisma.registration.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Registration deleted successfully' })
  } catch (error) {
    console.error('Error deleting registration:', error)
    return NextResponse.json(
      { error: 'Failed to delete registration' },
      { status: 500 }
    )
  }
}

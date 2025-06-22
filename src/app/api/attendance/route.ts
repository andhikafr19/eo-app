import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/attendance - Get attendance records
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const registrationId = searchParams.get('registrationId')
    const sessionId = searchParams.get('sessionId')
    const date = searchParams.get('date')

    const where: {
      registrationId?: string
      registration?: {
        eventId?: string
        userId?: string
        event?: {
          createdById: string
        }
      }
      sessionId?: string | null
      checkInTime?: {
        gte: Date
        lt: Date
      }
    } = {}

    if (registrationId) {
      where.registrationId = registrationId
    } else if (eventId) {
      where.registration = {
        eventId: eventId
      }
    }

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      where.checkInTime = {
        gte: startDate,
        lt: endDate
      }
    }

    // Role-based filtering
    if (session.user.role === 'USER') {
      where.registration = {
        ...where.registration,
        userId: session.user.id
      }
    } else if (session.user.role === 'EVENT_ORGANIZER') {
      where.registration = {
        ...where.registration,
        event: {
          createdById: session.user.id
        }
      }
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        registration: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            event: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                location: true
              }            }
          }
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    })

    return NextResponse.json({ attendances })

  } catch (error) {
    console.error('Attendance fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/attendance - Create attendance record (check-in)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN and EVENT_ORGANIZER can create attendance records
    if (!['ADMIN', 'EVENT_ORGANIZER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }    const body = await request.json()
    const {
      registrationId,
      sessionId
    } = body

    if (!registrationId) {
      return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 })
    }

    // Verify registration exists and is confirmed
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { 
        event: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    if (registration.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Registration not confirmed' }, { status: 400 })
    }

    // Check if already checked in for this session
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        registrationId,
        sessionId: sessionId || null
      }
    })

    if (existingAttendance) {
      return NextResponse.json({ 
        error: 'Already checked in for this session',
        attendance: existingAttendance
      }, { status: 400 })
    }    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        registrationId,
        checkInTime: new Date(),
        sessionId: sessionId || null,
        method: 'MANUAL'
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

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      attendance,
      participant: {
        name: registration.user.name,
        email: registration.user.email,
        event: registration.event.name
      }
    })

  } catch (error) {
    console.error('Attendance creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'EVENT_ORGANIZER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const attendanceId = params.id
    const body = await request.json()
    const { action } = body

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        registration: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            event: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    if (action === 'checkout') {
      if (attendance.checkOutTime) {
        return NextResponse.json({ error: 'Already checked out' }, { status: 400 })
      }      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          checkOutTime: new Date()
        },
        include: {
          registration: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              event: { select: { id: true, name: true } }
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Check-out successful',
        attendance: updatedAttendance,
        participant: {
          name: attendance.registration.user.name,
          email: attendance.registration.user.email,
          event: attendance.registration.event.name
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Attendance update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const attendanceId = params.id

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        registration: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            event: { 
              select: { 
                id: true, 
                name: true, 
                startDate: true, 
                endDate: true,
                location: true 
              } 
            }
          }
        },
        session: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            location: true          }
        }
      }
    })

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }    // Role-based access control
    if (session.user.role === 'USER' && attendance.registrationId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ attendance })

  } catch (error) {
    console.error('Attendance fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

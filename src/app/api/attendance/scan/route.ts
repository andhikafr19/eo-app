import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'EVENT_ORGANIZER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { qrData, sessionId, action = 'checkin' } = body

    if (!qrData) {
      return NextResponse.json({ error: 'QR data is required' }, { status: 400 })
    }    // Parse QR data with enhanced error handling
    let qrCodeData
    try {
      // Try to parse as JSON first
      qrCodeData = JSON.parse(qrData)
    } catch {
      // If JSON parsing fails, try to extract data from different formats
      try {
        // Check if it's a URL with query parameters
        if (qrData.startsWith('http')) {
          const url = new URL(qrData)
          const registrationId = url.searchParams.get('registrationId')
          const eventId = url.searchParams.get('eventId') 
          const userId = url.searchParams.get('userId')
          
          if (registrationId && eventId && userId) {
            qrCodeData = { registrationId, eventId, userId }
          } else {
            throw new Error('Missing required parameters in URL')
          }
        }
        // Check if it's a simple ID format
        else if (qrData.match(/^[a-zA-Z0-9-_]+$/)) {
          // Assume it's a registration ID
          qrCodeData = { registrationId: qrData }
        }
        // Try to parse as base64 encoded JSON
        else {
          const decoded = Buffer.from(qrData, 'base64').toString('utf-8')
          qrCodeData = JSON.parse(decoded)
        }
      } catch {
        return NextResponse.json({ 
          error: 'Invalid QR code format',
          details: 'QR data must be valid JSON, URL with parameters, or registration ID',
          received: qrData.substring(0, 100) + (qrData.length > 100 ? '...' : '')
        }, { status: 400 })
      }
    }

    const { registrationId } = qrCodeData

    if (!registrationId) {
      return NextResponse.json({ error: 'Invalid QR code: missing registration ID' }, { status: 400 })
    }    // Verify ticket exists and is valid
    // First try to find by exact QR code match
    let ticket = await prisma.ticket.findFirst({
      where: {
        qrCodeData: qrData
      },
      include: {
        registration: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            event: {
              select: { 
                id: true, 
                name: true, 
                startDate: true, 
                endDate: true,
                location: true,
                status: true
              }
            }
          }
        }
      }
    })

    // If not found by exact QR match, try by registration ID
    if (!ticket) {
      ticket = await prisma.ticket.findFirst({
        where: {
          registrationId
        },
        include: {
          registration: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              },
              event: {
                select: { 
                  id: true, 
                  name: true, 
                  startDate: true, 
                  endDate: true,
                  location: true,
                  status: true
                }
              }
            }
          }
        }
      })
    }

    // If still not found, try by ticket number (in case QR contains ticket number)
    if (!ticket) {
      ticket = await prisma.ticket.findFirst({
        where: {
          ticketNumber: registrationId // registrationId might actually be ticketNumber
        },
        include: {
          registration: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              },
              event: {
                select: { 
                  id: true, 
                  name: true, 
                  startDate: true, 
                  endDate: true,
                  location: true,
                  status: true
                }
              }
            }
          }
        }
      })
    }    if (!ticket) {
      // Provide more debugging info
      const allTickets = await prisma.ticket.findMany({
        select: {
          id: true,
          registrationId: true,
          ticketNumber: true,
          qrCodeData: true
        },
        take: 5
      })
      
      return NextResponse.json({ 
        error: 'Invalid ticket',
        details: 'Ticket not found or QR code is invalid',
        debug: {
          searchedId: registrationId,
          receivedQrData: qrData.substring(0, 200),
          searchAttempts: [
            'Exact QR code match',
            'Registration ID match', 
            'Ticket number match'
          ],
          availableTickets: allTickets.map(t => ({
            id: t.id.substring(0, 8) + '...',
            registrationId: t.registrationId,
            ticketNumber: t.ticketNumber,
            qrDataPreview: t.qrCodeData?.substring(0, 100) + '...'
          }))
        }
      }, { status: 404 })
    }if (ticket.registration.status !== 'CONFIRMED') {
      return NextResponse.json({ 
        error: 'Registration not confirmed',
        details: 'Participant registration is not confirmed'
      }, { status: 400 })
    }

    // Check event status - only allow scanning for PUBLISHED or ONGOING events
    if (!['PUBLISHED', 'ONGOING'].includes(ticket.registration.event.status)) {
      return NextResponse.json({ 
        error: 'Event not available for check-in',
        details: `Event status is ${ticket.registration.event.status}. Scanning is only allowed for PUBLISHED or ONGOING events.`
      }, { status: 400 })
    }

    // Check if event is active
    const now = new Date()
    const eventStartDate = new Date(ticket.registration.event.startDate)
    const eventEndDate = new Date(ticket.registration.event.endDate)
    
    if (now < eventStartDate) {
      return NextResponse.json({ 
        error: 'Event not started',
        details: 'Event has not started yet'
      }, { status: 400 })
    }
    
    if (now > eventEndDate) {
      return NextResponse.json({ 
        error: 'Event ended',
        details: 'Event has already ended'
      }, { status: 400 })
    }

    if (action === 'checkin') {
      // Check if already checked in for this session
      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          registrationId,
          sessionId: sessionId || null
        }
      })

      if (existingAttendance) {
        return NextResponse.json({ 
          error: 'Already checked in',
          details: `Already checked in at ${existingAttendance.checkInTime}`,
          attendance: existingAttendance
        }, { status: 400 })
      }      // Create attendance record
      const attendance = await prisma.attendance.create({
        data: {
          registrationId,
          checkInTime: new Date(),
          sessionId: sessionId || null,
          method: 'QR_CODE'
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
          },
          session: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Check-in successful',
        attendance,
        participant: {
          name: ticket.registration.user.name,
          email: ticket.registration.user.email,
          event: ticket.registration.event.name,
          checkInTime: attendance.checkInTime
        }
      })

    } else if (action === 'checkout') {
      // Find existing attendance record
      const attendance = await prisma.attendance.findFirst({
        where: {
          registrationId,
          sessionId: sessionId || null,
          checkInTime: { not: null },
          checkOutTime: null
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

      if (!attendance) {
        return NextResponse.json({ 
          error: 'No active check-in found',
          details: 'Participant must check-in first'
        }, { status: 400 })
      }      // Update attendance with check-out
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance.id },
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
          event: attendance.registration.event.name,
          checkOutTime: updatedAttendance.checkOutTime
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('QR scan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

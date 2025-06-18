import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET /api/test-data - Create test data
export async function GET() {
  try {
    // Check if admin user exists
    let adminUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    })

    // Create admin user if not exists
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      adminUser = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
    }

    // Check if test event exists
    let testEvent = await prisma.event.findFirst({
      where: { name: 'Test Seminar Web Development' }
    })    // Create test event if not exists
    if (!testEvent) {
      testEvent = await prisma.event.create({
        data: {
          id: 'test-event-123', // Simple ID for testing
          name: 'Test Seminar Web Development',
          description: 'Seminar tentang pengembangan web modern dengan Next.js dan React',
          startDate: new Date('2024-03-15T09:00:00Z'),
          endDate: new Date('2024-03-15T17:00:00Z'),
          location: 'Hotel Santika Jakarta',
          maxCapacity: 100,
          status: 'PUBLISHED',
          createdById: adminUser.id
        }
      })
    }

    // Get all events
    const events = await prisma.event.findMany({
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { registrations: true }
        }
      }
    })

    return NextResponse.json({
      message: 'Test data created/checked successfully',
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      },
      testEvent: {
        id: testEvent.id,
        name: testEvent.name
      },
      allEvents: events
    })
  } catch (error) {
    console.error('Error creating test data:', error)
    return NextResponse.json(
      { error: 'Failed to create test data', details: error },
      { status: 500 }
    )
  }
}

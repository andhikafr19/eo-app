"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { EventForm } from '@/components/forms/event-form'
import { Button } from '@/components/ui/button'

type EventFormData = {
  name: string
  description?: string
  startDate: string
  endDate: string
  location: string
  maxCapacity?: number
}

interface Event {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  location: string
  maxCapacity: number | null
  status: string
}

export default function EditEventPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user can edit events
  const userRole = session?.user?.role
  const canEditEvents = userRole === 'ADMIN' || userRole === 'EVENT_ORGANIZER'

  // Redirect if not authenticated or unauthorized
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && !canEditEvents) {
      router.push('/dashboard')
    }
  }, [status, canEditEvents, router])

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/events/${eventId}`)
        if (response.ok) {
          const eventData = await response.json()
          setEvent(eventData)
        } else if (response.status === 404) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching event:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated' && canEditEvents) {
      fetchEvent()
    }
  }, [eventId, status, canEditEvents, router])

  // Handle form submission
  const handleSubmit = async (data: EventFormData) => {
    if (!event) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push(`/dashboard/events/${event.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update event')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      alert('Failed to update event')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format date for form input
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString)
    // Adjust for timezone offset
    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return adjustedDate.toISOString().slice(0, 16)
  }

  // Show loading while checking auth or fetching data
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  // Show unauthorized message for regular users
  if (!canEditEvents) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to edit events. Only administrators and event organizers can edit events.
          </p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show loading if event not loaded yet
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const defaultValues = {
    name: event.name,
    description: event.description || '',
    startDate: formatDateForInput(event.startDate),
    endDate: formatDateForInput(event.endDate),
    location: event.location,
    maxCapacity: event.maxCapacity || undefined,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href={`/dashboard/events/${event.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Event
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Event</h1>
            <p className="text-gray-600">
              Update the details below to modify your seminar or training event.
            </p>
          </div>

          <EventForm
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            submitLabel="Update Event"
          />
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users, Clock, Edit, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface Event {
  id: string
  name: string
  description: string | null
  startDate: string
  endDate: string
  location: string
  maxCapacity: number | null
  status: string
  createdAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    registrations: number
  }
}

export default function EventDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Check if user can edit events
  const userRole = session?.user?.role
  const canEditEvents = userRole === 'ADMIN' || userRole === 'EVENT_ORGANIZER'

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

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

    if (status === 'authenticated') {
      fetchEvent()
    }
  }, [eventId, status, router])

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!event || !confirm('Are you sure you want to delete this event?')) return
    
    try {
      setDeleting(true)
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.push('/dashboard')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'ONGOING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !event) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            
            {canEditEvents && (
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/events/${event.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Event
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeleteEvent}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Event Header */}
          <div className="p-8 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(event.status)}`}>
                  {event.status}
                </span>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Date & Time */}
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Date & Time</h3>
                    <p className="text-gray-600">
                      <span className="block">Start: {formatDate(event.startDate)}</span>
                      <span className="block">End: {formatDate(event.endDate)}</span>
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Location</h3>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>

                {/* Capacity */}
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Capacity</h3>
                    <p className="text-gray-600">
                      {event._count.registrations} registered
                      {event.maxCapacity && ` / ${event.maxCapacity} max`}
                    </p>
                  </div>
                </div>

                {/* Created Info */}
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Created</h3>
                    <p className="text-gray-600">
                      {formatDate(event.createdAt)} by {event.createdBy.name || event.createdBy.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Description</h3>
                <div className="text-gray-600 whitespace-pre-wrap">
                  {event.description || 'No description provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

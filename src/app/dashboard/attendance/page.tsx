// src/app/dashboard/attendance/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  location: string
  status: string
}

export default function AttendancePage() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  // Get eventId from URL params if available
  const urlEventId = searchParams.get('eventId')

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/events')
      if (response.ok) {
        const data = await response.json()
        const publishedEvents = data.events?.filter((event: Event) => 
          event.status === 'PUBLISHED' || event.status === 'ONGOING'
        ) || []
        setEvents(publishedEvents)
        
        // Auto-select first event if none selected
        if (publishedEvents.length > 0 && !selectedEventId && !urlEventId) {
          setSelectedEventId(publishedEvents[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, urlEventId])

  useEffect(() => {
    fetchEvents()
    if (urlEventId) {
      setSelectedEventId(urlEventId)
    }
  }, [fetchEvents, urlEventId])

  const selectedEvent = events.find(event => event.id === selectedEventId)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading events...</div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">No Active Events</h2>
        <p className="text-gray-600 mb-6">
          There are no published or ongoing events available for attendance tracking.
        </p>
        <Button onClick={() => window.location.href = '/dashboard/events'}>
          Manage Events
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Attendance Management</h1>
        <p className="text-gray-600">
          Track and manage event attendance with QR code scanning
        </p>
      </div>

      {/* Event Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (              <button
                key={event.id}
                className={`w-full text-left p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedEventId === event.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedEventId(event.id)}
              >
                <h3 className="font-semibold text-lg mb-2">{event.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>📍 {event.location}</div>
                  <div>📅 {new Date(event.startDate).toLocaleDateString()}</div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      event.status === 'ONGOING' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {event.status}
                    </span>                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Dashboard */}
      {selectedEventId && selectedEvent && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-800">
              Tracking Attendance for: {selectedEvent.name}
            </h2>
            <p className="text-blue-600 text-sm">
              Location: {selectedEvent.location} | 
              Date: {new Date(selectedEvent.startDate).toLocaleDateString()}
            </p>
          </div>
          
          <AttendanceDashboard eventId={selectedEventId} />
        </div>
      )}
    </div>
  )
}

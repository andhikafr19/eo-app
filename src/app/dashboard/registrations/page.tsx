"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Eye, XCircle, CheckCircle, Ticket } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Registration {
  id: string
  status: string
  category: string
  createdAt: string
  ticket?: {
    id: string
    ticketNumber: string
    qrCode: string
    isUsed: boolean
    usedAt: string | null
  }
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
    location: string
    status: string
  }
}

export default function MyRegistrationsPage() {
  const { status } = useSession()
  const router = useRouter()
  
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Fetch user registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/registrations')
        if (response.ok) {
          const data = await response.json()
          setRegistrations(data)
        }
      } catch (error) {
        console.error('Error fetching registrations:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchRegistrations()
    }
  }, [status])

  // Filter registrations
  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = registration.event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.event.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || registration.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'WAITLIST':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Handle cancel registration
  const handleCancelRegistration = async (registrationId: string) => {
    if (!confirm('Are you sure you want to cancel this registration?')) {
      return
    }

    try {
      const response = await fetch(`/api/registrations/${registrationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      })
      
      if (response.ok) {
        // Update local state
        setRegistrations(prev => 
          prev.map(reg => 
            reg.id === registrationId 
              ? { ...reg, status: 'CANCELLED' }
              : reg
          )
        )
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to cancel registration')
      }
    } catch (error) {
      console.error('Error cancelling registration:', error)
      alert('Failed to cancel registration')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Registrations</h1>
              <p className="text-gray-600">View and manage your event registrations</p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
                <option value="WAITLIST">Waitlist</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Registrations List */}
        {filteredRegistrations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No registrations found matching your criteria.' 
                : 'You have no event registrations yet.'
              }
            </p>
            <Link href="/dashboard">
              <Button className="mt-4">Browse Events</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRegistrations.map((registration) => (
              <div key={registration.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {registration.event.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(registration.status)}`}>
                        {getStatusIcon(registration.status)}
                        <span className="ml-1">{registration.status}</span>
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {registration.category}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(registration.event.startDate)} - {formatDate(registration.event.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{registration.event.location}</span>
                      </div>                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Registered on {formatDate(registration.createdAt)}</span>
                      </div>
                      {registration.ticket && (
                        <div className="flex items-center">
                          <Ticket className="h-4 w-4 mr-2" />
                          <span>
                            Ticket #{registration.ticket.ticketNumber}
                            {registration.ticket.isUsed && ' (Used)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Link href={`/dashboard/events/${registration.event.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View Event
                      </Button>
                    </Link>
                    {registration.ticket && registration.status === 'CONFIRMED' && (
                      <Link href={`/dashboard/tickets/${registration.ticket.id}`}>
                        <Button variant="ghost" size="sm">
                          <Ticket className="h-4 w-4 mr-1" />
                          View Ticket
                        </Button>
                      </Link>
                    )}
                    {registration.status !== 'CANCELLED' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCancelRegistration(registration.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TicketCard } from '@/components/ticket/ticket-card'

interface Ticket {
  id: string
  ticketNumber: string
  qrCode: string
  isUsed: boolean
  usedAt: string | null
  createdAt: string
  registration: {
    id: string
    status: string
    category: string
    user: {
      id: string
      name: string | null
      email: string
    }
    event: {
      id: string
      name: string
      description: string | null
      startDate: string
      endDate: string
      location: string
      status: string
    }
  }
}

export default function TicketDetailPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams()
  const ticketId = params.id as string
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Fetch ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/tickets/${ticketId}`)
        if (response.ok) {
          const ticketData = await response.json()
          setTicket(ticketData)
        } else if (response.status === 404) {
          router.push('/dashboard/registrations')
        } else if (response.status === 403) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching ticket:', error)
        router.push('/dashboard/registrations')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchTicket()
    }
  }, [ticketId, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !ticket) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/dashboard/registrations">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Registrations
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Ticket</h1>
          <p className="text-gray-600">
            Your digital ticket for {ticket.registration.event.name}
          </p>
        </div>

        <div className="flex justify-center">
          <TicketCard ticket={ticket} />
        </div>
      </main>
    </div>
  )
}

"use client"

import { Calendar, MapPin, User, Clock, Download, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface TicketProps {
  ticket: {
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
}

export function TicketCard({ ticket }: TicketProps) {
  const { registration } = ticket
  const { event, user } = registration

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

  // Download ticket as image (simplified version)
  const downloadTicket = () => {
    // Create a temporary link to download the QR code
    const link = document.createElement('a')
    link.href = ticket.qrCode
    link.download = `ticket-${ticket.ticketNumber}.png`
    link.click()
  }

  // Print ticket
  const printTicket = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket - ${event.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .ticket { border: 2px solid #000; padding: 20px; max-width: 400px; }
              .qr-code { text-align: center; margin: 20px 0; }
              .qr-code img { width: 200px; height: 200px; }
              .event-info { margin-bottom: 15px; }
              .ticket-number { font-weight: bold; font-size: 18px; }
            </style>
          </head>
          <body>
            <div class="ticket">
              <h1>${event.name}</h1>
              <div class="ticket-number">Ticket #${ticket.ticketNumber}</div>
              <div class="event-info">
                <p><strong>Date:</strong> ${formatDate(event.startDate)} - ${formatDate(event.endDate)}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Attendee:</strong> ${user.name || user.email}</p>
                <p><strong>Category:</strong> ${registration.category}</p>
              </div>
              <div class="qr-code">
                <img src="${ticket.qrCode}" alt="QR Code" />
                <p>Present this QR code at the event</p>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border overflow-hidden max-w-md mx-auto">
      {/* Ticket Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{event.name}</h2>
            <p className="text-blue-100">Ticket #{ticket.ticketNumber}</p>
          </div>
          <QrCode className="h-8 w-8" />
        </div>
        
        {ticket.isUsed && (
          <div className="mt-3 bg-green-500 bg-opacity-20 border border-green-300 rounded px-3 py-1">
            <p className="text-sm">
              ✓ Used on {formatDate(ticket.usedAt!)}
            </p>
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Event Date</p>
              <p className="text-sm text-gray-600">
                {formatDate(event.startDate)}
              </p>
              <p className="text-sm text-gray-600">
                to {formatDate(event.endDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Location</p>
              <p className="text-sm text-gray-600">{event.location}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Attendee</p>
              <p className="text-sm text-gray-600">{user.name || user.email}</p>
              <p className="text-xs text-gray-500">{registration.category}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Registered</p>
              <p className="text-sm text-gray-600">
                {formatDate(ticket.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="border-t pt-4">
          <div className="text-center">
            <p className="font-medium text-gray-900 mb-3">
              Present this QR code at the event
            </p>            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
              <Image 
                src={ticket.qrCode} 
                alt="QR Code"
                width={192}
                height={192}
                className="mx-auto"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-4 space-y-2">
          <Button 
            onClick={printTicket}
            className="w-full"
            variant="default"
          >
            Print Ticket
          </Button>
          <Button 
            onClick={downloadTicket}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </div>
    </div>
  )
}

// Compact ticket card for lists
export function TicketListItem({ ticket }: TicketProps) {
  const { registration } = ticket
  const { event } = registration

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow border p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{event.name}</h3>
          <p className="text-sm text-gray-600">
            {formatDate(event.startDate)} • {event.location}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              #{ticket.ticketNumber}
            </span>
            {ticket.isUsed && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Used
              </span>
            )}
          </div>
        </div>        <div className="ml-4">
          <Image 
            src={ticket.qrCode} 
            alt="QR Code"
            width={64}
            height={64}
            className="border rounded"
          />
        </div>
      </div>
    </div>
  )
}

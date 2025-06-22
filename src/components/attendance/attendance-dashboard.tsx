// src/components/attendance/attendance-dashboard.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QRScanner } from './qr-scanner'

interface AttendanceRecord {
  id: string
  checkInTime: string | null
  checkOutTime: string | null
  method: string
  registration: {
    user: {
      name: string | null
      email: string
    }
    event: {
      name: string
    }
  }
  session?: {
    name: string
    startTime: string
    endTime: string
  } | null
}

interface AttendanceDashboardProps {
  eventId: string
  sessionId?: string
}

export function AttendanceDashboard({ eventId, sessionId }: AttendanceDashboardProps) {  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    participant?: {
      name: string
      email: string
      event: string
      checkInTime?: string
      checkOutTime?: string
    }
  } | null>(null)
  const fetchAttendances = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (eventId) params.set('eventId', eventId)
      if (sessionId) params.set('sessionId', sessionId)

      const response = await fetch(`/api/attendance?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAttendances(data.attendances || [])
      }
    } catch (error) {
      console.error('Failed to fetch attendances:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId, sessionId])
  useEffect(() => {
    fetchAttendances()
  }, [fetchAttendances])

  const handleScanResult = (result: {
    success: boolean
    message: string
    participant?: {
      name: string
      email: string
      event: string
      checkInTime?: string
      checkOutTime?: string
    }
  }) => {
    setScanResult(result)
    if (result.success) {
      // Refresh attendance list
      fetchAttendances()
      // Auto close scanner after successful scan
      setTimeout(() => {
        setShowScanner(false)
        setScanResult(null)
      }, 3000)
    }
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (attendance: AttendanceRecord) => {
    if (attendance.checkInTime && attendance.checkOutTime) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
          Completed
        </span>
      )
    } else if (attendance.checkInTime) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
          Checked In
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
        Registered
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading attendance data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Attendance Management</h2>
        <Button
          onClick={() => setShowScanner(!showScanner)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showScanner ? 'Close Scanner' : 'Open QR Scanner'}
        </Button>
      </div>

      {/* Scanner */}
      {showScanner && (
        <Card>
          <CardContent className="p-6">
            <QRScanner
              eventId={eventId}
              sessionId={sessionId}
              onScanResult={handleScanResult}
            />
          </CardContent>
        </Card>
      )}

      {/* Scan Result */}
      {scanResult && (
        <Card className={`border-l-4 ${scanResult.success ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className={`font-medium ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {scanResult.message}
            </div>
            {scanResult.participant && (
              <div className="mt-2 text-sm text-gray-600">
                <div><strong>Name:</strong> {scanResult.participant.name}</div>
                <div><strong>Email:</strong> {scanResult.participant.email}</div>
                <div><strong>Event:</strong> {scanResult.participant.event}</div>
                {scanResult.participant.checkInTime && (
                  <div><strong>Check-in:</strong> {formatTime(scanResult.participant.checkInTime)}</div>
                )}
                {scanResult.participant.checkOutTime && (
                  <div><strong>Check-out:</strong> {formatTime(scanResult.participant.checkOutTime)}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {attendances.length}
            </div>
            <div className="text-sm text-gray-600">Total Attendances</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {attendances.filter(a => a.checkInTime).length}
            </div>
            <div className="text-sm text-gray-600">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {attendances.filter(a => a.checkInTime && a.checkOutTime).length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Participant</th>
                    <th className="text-left p-3">Event</th>
                    <th className="text-left p-3">Check In</th>
                    <th className="text-left p-3">Check Out</th>
                    <th className="text-left p-3">Method</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((attendance) => (
                    <tr key={attendance.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {attendance.registration.user.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {attendance.registration.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">
                          {attendance.registration.event.name}
                        </div>
                        {attendance.session && (
                          <div className="text-sm text-gray-600">
                            Session: {attendance.session.name}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {formatTime(attendance.checkInTime)}
                      </td>
                      <td className="p-3">
                        {formatTime(attendance.checkOutTime)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          attendance.method === 'QR_CODE' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {attendance.method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(attendance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

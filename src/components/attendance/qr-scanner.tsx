// src/components/attendance/qr-scanner-clean.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

interface QRScanResult {
  success: boolean
  message: string
  participant?: {
    name: string
    email: string
    event: string
    checkInTime?: string
    checkOutTime?: string
  }
  attendance?: Record<string, unknown>
}

interface QRScannerProps {
  readonly eventId?: string
  readonly sessionId?: string
  readonly onScanResult: (result: QRScanResult) => void
}

export function QRScanner({ eventId, sessionId, onScanResult }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [action, setAction] = useState<'checkin' | 'checkout'>('checkin')
  const [manualInput, setManualInput] = useState('')
  const [loadingSample, setLoadingSample] = useState(false)
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'upload'>('camera')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  const processQRData = useCallback(async (qrData: string) => {
    try {
      setIsScanning(true)
      
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrData,
          sessionId,
          action
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        onScanResult({
          success: true,
          message: result.message,
          participant: result.participant,
          attendance: result.attendance
        })
      } else {
        const errorMessage = result.error ?? 'Scan failed'
        const debugInfo = result.debug ? `\n\nDebug Info:\n- Registration ID: ${result.debug.searchedRegistrationId}\n- Available tickets: ${result.debug.availableTickets?.length ?? 0}` : ''
        
        onScanResult({
          success: false,
          message: errorMessage + debugInfo,
          participant: result.participant
        })
      }
    } catch {
      onScanResult({
        success: false,
        message: 'Network error occurred'
      })
    } finally {
      setIsScanning(false)
      setManualInput('')
    }
  }, [sessionId, action, onScanResult])

  const getSampleQR = async () => {
    try {
      setLoadingSample(true)
      const response = await fetch('/api/debug/sample-qr')
      const data = await response.json()
      
      if (response.ok && data.qrData) {
        setManualInput(data.qrData)
        onScanResult({
          success: true,
          message: `Sample QR loaded for ${data.userName} - ${data.eventName}`
        })
      } else {
        onScanResult({
          success: false,
          message: data.error ?? 'No sample QR available. Please create an event and registration first.'
        })
      }
    } catch {
      onScanResult({
        success: false,
        message: 'Failed to load sample QR data'
      })
    } finally {
      setLoadingSample(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      await processQRData(manualInput.trim())
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onScanResult({
        success: false,
        message: 'Please upload a valid image file'
      })
      return
    }
    
    try {
      setIsScanning(true)
      
      const codeReader = new BrowserMultiFormatReader()
      const imageUrl = URL.createObjectURL(file)
      
      try {
        const result = await codeReader.decodeFromImageUrl(imageUrl)
        
        if (result) {
          await processQRData(result.getText())
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          onScanResult({
            success: false,
            message: 'No QR code found in the image. Please ensure the QR code is clear and well-lit.'
          })
        } else {
          throw error
        }
      }
      
      URL.revokeObjectURL(imageUrl)
      
    } catch (error) {
      console.error('QR code scanning error:', error)
      onScanResult({
        success: false,
        message: `Failed to scan QR code: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsScanning(false)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Camera functions optimized for laptop webcam
  const startCamera = async () => {
    try {
      setCameraError(null)
      setIsCameraActive(true)
      
      // Initialize ZXing reader
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader
      
      // Get available video devices
      const videoInputDevices = await codeReader.listVideoInputDevices()
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera devices found. Please ensure camera permissions are granted.')
      }
      
      // For laptop: prefer front camera (user-facing) for easier QR scanning
      const laptopCamera = videoInputDevices.find(device => {
        const label = device.label.toLowerCase()
        return label.includes('front') || 
               label.includes('user') ||
               label.includes('facetime') ||
               label.includes('integrated') ||
               label.includes('webcam') ||
               (!label.includes('back') && !label.includes('environment'))
      }) || videoInputDevices[0]
      
      console.log('🎥 Selected camera:', laptopCamera.label)
      
      if (!videoRef.current) {
        throw new Error('Video element not found')
      }
      
      // Start decoding with enhanced error handling
      await codeReader.decodeFromVideoDevice(
        laptopCamera.deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            // QR Code detected successfully
            console.log('✅ QR Code detected:', result.getText())
            // Play success sound
            playSuccessSound()
            stopCamera()
            processQRData(result.getText())
          }
          
          if (error && !(error instanceof NotFoundException)) {
            // Only log significant errors to avoid console spam
            console.warn('⚠️ ZXing scanning error:', error.message)
          }
        }
      )
      
      // Set stream reference for cleanup
      if (videoRef.current.srcObject) {
        streamRef.current = videoRef.current.srcObject as MediaStream
      }
      
    } catch (error) {
      console.error('❌ Camera access error:', error)
      let errorMessage = 'Unable to access camera.'
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '🚫 Camera access denied. Please allow camera permissions in your browser settings and try again.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = '📷 No camera found. Please ensure your camera is connected and working.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = '🔒 Camera is already in use by another application. Please close other apps using the camera.'
        } else {
          errorMessage = `Camera error: ${error.message}`
        }
      }
      
      setCameraError(errorMessage)
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    // Reset ZXing reader with proper cleanup
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset()
        codeReaderRef.current = null
      } catch (error) {
        console.warn('Error resetting code reader:', error)
      }
    }
    
    // Stop all media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log(`🛑 Stopped ${track.kind} track`)
      })
      streamRef.current = null
    }
    
    // Clear video source and pause
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
      videoRef.current.load() // Reset video element
    }
    
    setIsCameraActive(false)
    setCameraError(null)
  }
  
  // Play success sound when QR code is detected
  const playSuccessSound = () => {
    try {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || (window as unknown as typeof AudioContext))()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch {
      // Ignore audio errors
      console.log('🔇 Audio feedback not available')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🎥 QR Code Scanner - Laptop Optimized</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Selection */}
        <div className="flex gap-2">
          <Button
            variant={action === 'checkin' ? 'default' : 'outline'}
            onClick={() => setAction('checkin')}
            className="flex-1"
          >
            ✅ Check In
          </Button>
          <Button
            variant={action === 'checkout' ? 'default' : 'outline'}
            onClick={() => setAction('checkout')}
            className="flex-1"
          >
            ⏰ Check Out
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'camera' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📹 Webcam
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'manual' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⌨️ Manual
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'upload' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📁 Upload
          </button>
        </div>

        {/* Camera Tab - Optimized for Laptop Webcam */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative">
                {!isCameraActive ? (
                  <div className="space-y-3">
                    <div className="w-full h-56 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">💻📷</div>
                        <div className="text-sm text-gray-600 mb-1">Laptop Webcam Scanner</div>
                        <div className="text-xs text-gray-500">Optimized for front-facing camera</div>
                      </div>
                    </div>
                    <Button
                      onClick={startCamera}
                      disabled={isScanning}
                      className="w-full"
                    >
                      {isScanning ? '⏳ Starting Webcam...' : '🎥 Start Webcam Scan'}
                    </Button>
                    {cameraError && (
                      <div className="text-sm text-red-600 p-3 bg-red-50 rounded border">
                        <div className="font-medium mb-1">⚠️ Camera Error:</div>
                        <div>{cameraError}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-full h-64 bg-black rounded-lg object-cover"
                        playsInline
                        muted
                        autoPlay
                      />
                      
                      {/* Enhanced overlay for laptop webcam */}
                      <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                        {/* QR Code target area */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-4 border-red-500 bg-red-500/10 rounded-lg">
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-red-600 text-sm font-medium bg-white px-2 py-1 rounded shadow">
                            📱 Position QR Code Here
                          </div>
                          
                          {/* Corner guides */}
                          <div className="absolute top-2 left-2 w-4 h-4 border-l-4 border-t-4 border-yellow-400"></div>
                          <div className="absolute top-2 right-2 w-4 h-4 border-r-4 border-t-4 border-yellow-400"></div>
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-4 border-b-4 border-yellow-400"></div>
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-4 border-b-4 border-yellow-400"></div>
                        </div>
                      </div>
                      
                      {/* Status indicators */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          📹 Webcam Active
                        </div>
                        <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                          🔍 Scanning...
                        </div>
                      </div>
                      
                      {/* Distance indicator */}
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                        📏 Keep 8-15 inches distance
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={stopCamera}
                        variant="outline"
                        className="flex-1"
                      >
                        🛑 Stop Camera
                      </Button>
                      <Button
                        onClick={() => {
                          // Quick restart for better positioning
                          stopCamera()
                          setTimeout(startCamera, 500)
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        🔄 Restart
                      </Button>
                    </div>
                    
                    {/* Laptop-specific tips */}
                    <div className="text-xs text-gray-600 text-center space-y-1">
                      <div>💡 <strong>Laptop Tips:</strong></div>
                      <div>• Adjust screen brightness if QR code appears dark</div>
                      <div>• Tilt laptop slightly to reduce glare</div>
                      <div>• Use phone flashlight for better lighting</div>
                      <div>• Press Space to start/stop camera</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            {/* Sample Data Buttons */}
            <div className="space-y-2">
              <div className="text-sm font-medium">🧪 Quick Test Data:</div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={getSampleQR}
                  className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 rounded border text-left font-medium"
                  disabled={isScanning || loadingSample}
                >
                  {loadingSample ? '⏳ Loading...' : '🎫 Get Real Ticket QR'}
                </button>
                <button
                  type="button"
                  onClick={() => setManualInput('{"registrationId":"clxy123abc","eventId":"clev456def","userId":"clus789ghi","timestamp":"2025-06-19T10:30:00.000Z"}')}
                  className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded border text-left"
                  disabled={isScanning}
                >
                  📋 Sample JSON Format
                </button>
              </div>
            </div>

            {/* Manual Input */}
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <label htmlFor="qr-input" className="text-sm font-medium">⌨️ Manual QR Data Input:</label>
              <div className="text-xs text-gray-500 mb-2">
                Expected format: JSON like {`{"registrationId":"abc123","eventId":"def456","userId":"ghi789"}`}
              </div>
              <div className="flex gap-2">
                <input
                  id="qr-input"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Paste QR code data here..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isScanning}
                />
                <Button
                  type="submit"
                  disabled={!manualInput.trim() || isScanning}
                  className="shrink-0"
                >
                  {isScanning ? '⏳ Processing...' : '🔍 Scan'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="qr-file" className="text-sm font-medium">📁 Upload QR Code Image:</label>
              <input
                id="qr-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isScanning}
              />
              <p className="text-xs text-gray-500">
                📸 Upload a clear image of the QR code (PNG, JPG, etc.)
              </p>
            </div>
          </div>
        )}

        {/* Session & Event Info */}
        {sessionId && (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
            🎯 Session: {sessionId}
          </div>
        )}
        
        {eventId && (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
            📅 Event: {eventId}
          </div>
        )}

        {/* Status */}
        {isScanning && (
          <div className="text-center text-blue-600 animate-pulse">
            ⏳ Processing scan...
          </div>
        )}
        
        {/* Keyboard Shortcuts Help */}
        <div className="text-xs text-gray-500 border rounded-lg p-3 bg-gray-50">
          <div className="font-medium mb-1">⌨️ Keyboard Shortcuts:</div>
          <div className="grid grid-cols-1 gap-1">
            <div><kbd className="px-1 bg-gray-200 rounded text-xs">Space</kbd> - Start/Stop Camera (when camera tab active)</div>
            <div><kbd className="px-1 bg-gray-200 rounded text-xs">Esc</kbd> - Stop Camera</div>
            <div><kbd className="px-1 bg-gray-200 rounded text-xs">1/2/3</kbd> - Switch Tabs</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

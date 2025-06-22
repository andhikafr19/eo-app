import QRCode from 'qrcode'
import crypto from 'crypto'

// Generate unique ticket number
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `TK-${timestamp}-${random}`
}

// Generate QR code data with security hash
export function generateQRCodeData(registrationId: string, eventId: string, userId: string): string {
  const timestamp = new Date().toISOString()
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  
  // Create data object
  const data = {
    registrationId,
    eventId,
    userId,
    timestamp,
    type: 'EVENT_TICKET'
  }
  
  // Create hash for security
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex')
  
  // Combine data with hash
  const qrData = {
    ...data,
    hash
  }
  
  return JSON.stringify(qrData)
}

// Define QR code data type
interface QRCodeData {
  registrationId: string
  eventId: string
  userId: string
  timestamp: string
  type: string
  hash: string
}

// Verify QR code data integrity
export function verifyQRCodeData(qrDataString: string): { valid: boolean; data?: QRCodeData; error?: string } {
  try {
    const qrData = JSON.parse(qrDataString)
    const { hash, ...originalData } = qrData
    
    if (!hash || !qrData.registrationId || !qrData.eventId) {
      return { valid: false, error: 'Invalid QR code format' }
    }
    
    // Verify hash
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(originalData))
      .digest('hex')
    
    if (hash !== expectedHash) {
      return { valid: false, error: 'QR code has been tampered with' }
    }
    
    // Check if QR code is not too old (24 hours for security)
    const qrTimestamp = new Date(qrData.timestamp)
    const now = new Date()
    const hoursDiff = (now.getTime() - qrTimestamp.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff > 24) {
      return { valid: false, error: 'QR code has expired' }
    }
    
    return { valid: true, data: qrData }
  } catch {
    return { valid: false, error: 'Invalid QR code format' }
  }
}

// Generate QR code image as base64
export async function generateQRCodeImage(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    })
    
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

// Generate ticket with QR code
export async function generateTicket(registrationId: string, eventId: string, userId: string) {
  const ticketNumber = generateTicketNumber()
  const qrCodeData = generateQRCodeData(registrationId, eventId, userId)
  const qrCodeImage = await generateQRCodeImage(qrCodeData)
  
  return {
    ticketNumber,
    qrCodeData,
    qrCode: qrCodeImage
  }
}

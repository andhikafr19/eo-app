// Manual type definitions untuk mengatasi Prisma export issues

export const ParticipantCategory = {
  INTERNAL: 'INTERNAL',
  PUBLIC: 'PUBLIC',
  VIP: 'VIP'
} as const

export type ParticipantCategoryType = typeof ParticipantCategory[keyof typeof ParticipantCategory]

export const RegistrationStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  WAITLIST: 'WAITLIST'
} as const

export type RegistrationStatusType = typeof RegistrationStatus[keyof typeof RegistrationStatus]

export const EventStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const

export type EventStatusType = typeof EventStatus[keyof typeof EventStatus]

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  EVENT_ORGANIZER: 'EVENT_ORGANIZER'
} as const

export type UserRoleType = typeof UserRole[keyof typeof UserRole]

export const CheckInMethod = {
  QR_CODE: 'QR_CODE',
  MANUAL: 'MANUAL'
} as const

export type CheckInMethodType = typeof CheckInMethod[keyof typeof CheckInMethod]

// Validation functions
export function isValidParticipantCategory(category: unknown): category is ParticipantCategoryType {
  return Object.values(ParticipantCategory).includes(category as ParticipantCategoryType)
}

export function isValidRegistrationStatus(status: unknown): status is RegistrationStatusType {
  return Object.values(RegistrationStatus).includes(status as RegistrationStatusType)
}

export function isValidEventStatus(status: unknown): status is EventStatusType {
  return Object.values(EventStatus).includes(status as EventStatusType)
}

export function isValidUserRole(role: unknown): role is UserRoleType {
  return Object.values(UserRole).includes(role as UserRoleType)
}

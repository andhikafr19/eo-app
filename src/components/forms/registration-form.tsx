"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Registration form schema
const registrationSchema = z.object({
  category: z.enum(['INTERNAL', 'PUBLIC', 'VIP']),
  phone: z.string().optional().refine(
    (val) => !val || val.length >= 10, 
    { message: 'Phone number must be at least 10 digits' }
  ),
  organization: z.string().optional(),
  position: z.string().optional(),
  dietary: z.string().optional(),
  notes: z.string().optional()
})

type RegistrationFormData = z.infer<typeof registrationSchema>

interface RegistrationFormProps {
  eventId: string
  eventName: string
  onSuccess: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function RegistrationForm({ 
  eventId, 
  eventName, 
  onSuccess, 
  onCancel, 
  isLoading: externalLoading = false 
}: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      category: 'PUBLIC',
      phone: '',
      organization: '',
      position: '',
      dietary: '',
      notes: ''
    }
  })

  const onSubmit = async (data: RegistrationFormData) => {
    if (isSubmitting || externalLoading) return

    setIsSubmitting(true)

    try {
      // Prepare custom fields
      const customFields = {
        phone: data.phone || '',
        organization: data.organization || '',
        position: data.position || '',
        dietary: data.dietary || '',
        notes: data.notes || ''
      }

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          category: data.category,
          customFields
        }),
      })

      if (response.ok) {
        reset()
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to register for event')
      }
    } catch (error) {
      console.error('Error registering for event:', error)
      alert('Failed to register for event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || externalLoading

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Register for Event
        </h2>
        <p className="text-gray-600">
          Complete the form below to register for <strong>{eventName}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Participant Category */}
        <div className="space-y-2">
          <Label htmlFor="category">
            Participant Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="category"
            {...register('category')}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="PUBLIC">Public</option>
            <option value="INTERNAL">Internal</option>
            <option value="VIP">VIP</option>
          </select>
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter your phone number"
            {...register('phone')}
            disabled={isLoading}
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <Label htmlFor="organization">Organization/Company</Label>
          <Input
            id="organization"
            type="text"
            placeholder="Enter your organization"
            {...register('organization')}
            disabled={isLoading}
          />
          {errors.organization && (
            <p className="text-sm text-red-600">{errors.organization.message}</p>
          )}
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label htmlFor="position">Position/Title</Label>
          <Input
            id="position"
            type="text"
            placeholder="Enter your position"
            {...register('position')}
            disabled={isLoading}
          />
          {errors.position && (
            <p className="text-sm text-red-600">{errors.position.message}</p>
          )}
        </div>

        {/* Dietary Requirements */}
        <div className="space-y-2">
          <Label htmlFor="dietary">Dietary Requirements</Label>
          <Input
            id="dietary"
            type="text"
            placeholder="Any dietary requirements or allergies"
            {...register('dietary')}
            disabled={isLoading}
          />
          {errors.dietary && (
            <p className="text-sm text-red-600">{errors.dietary.message}</p>
          )}
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Any additional information or special requests"
            {...register('notes')}
            disabled={isLoading}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          {errors.notes && (
            <p className="text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Registering...' : 'Register for Event'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Zod schema for event validation
const eventSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Event name too long"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required").max(200, "Location too long"),
  maxCapacity: z.number().min(1, "Capacity must be at least 1").optional(),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventFormProps {
  defaultValues?: Partial<EventFormData>
  onSubmit: (data: EventFormData) => void
  isLoading?: boolean
  submitLabel?: string
}

export function EventForm({ 
  defaultValues, 
  onSubmit, 
  isLoading = false,
  submitLabel = "Create Event"
}: EventFormProps) {
  // Get current date and time for default values
  const now = new Date()
  const currentDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16) // Format: YYYY-MM-DDTHH:MM

  const oneHourLater = new Date(now.getTime() - now.getTimezoneOffset() * 60000 + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),    defaultValues: {
      name: "",
      description: "",
      startDate: currentDateTime,
      endDate: oneHourLater,
      location: "",
      maxCapacity: undefined,
      ...defaultValues
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">      {/* Event Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Enter event name"
          className={cn(errors.name && "border-red-500 focus:ring-red-500 focus:border-red-500")}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>{/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register("description")}
          placeholder="Enter event description"
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 resize-none",
            errors.description && "border-red-500 focus:ring-red-500 focus:border-red-500"
          )}
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date & Time *</Label>
          <Input
            id="startDate"
            type="datetime-local"
            {...register("startDate")}
            className={cn(
              "w-full text-gray-900 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
              errors.startDate && "border-red-500 focus:ring-red-500 focus:border-red-500"
            )}
          />
          {errors.startDate && (
            <p className="text-sm text-red-500">{errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date & Time *</Label>
          <Input
            id="endDate"
            type="datetime-local"
            {...register("endDate")}
            className={cn(
              "w-full text-gray-900 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
              errors.endDate && "border-red-500 focus:ring-red-500 focus:border-red-500"
            )}
          />
          {errors.endDate && (
            <p className="text-sm text-red-500">{errors.endDate.message}</p>
          )}
        </div>
      </div>      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          {...register("location")}
          placeholder="Enter event location"
          className={cn(errors.location && "border-red-500 focus:ring-red-500 focus:border-red-500")}
        />
        {errors.location && (
          <p className="text-sm text-red-500">{errors.location.message}</p>
        )}
      </div>

      {/* Max Capacity */}
      <div className="space-y-2">
        <Label htmlFor="maxCapacity">Maximum Capacity</Label>
        <Input
          id="maxCapacity"
          type="number"
          {...register("maxCapacity", { valueAsNumber: true })}
          placeholder="Enter maximum number of participants"
          className={cn(errors.maxCapacity && "border-red-500 focus:ring-red-500 focus:border-red-500")}
        />
        {errors.maxCapacity && (
          <p className="text-sm text-red-500">{errors.maxCapacity.message}</p>
        )}
      </div>      {/* Submit Button */}
      <div className="pt-6 border-t border-gray-200">
        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: '#2563eb',
            color: '#ffffff',
            minHeight: '44px',
            display: 'flex',
            visibility: 'visible'
          }}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating Event...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

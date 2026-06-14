export type JobStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface JobApplication {
  id: string
  company: string
  role: string
  url?: string
  location?: string
  salary?: string
  notes?: string
  status: JobStatus
  createdAt: number
  updatedAt: number
}

export const JOB_STATUSES: { id: JobStatus; label: string; color: string }[] = [
  { id: 'wishlist', label: 'Wishlist', color: '#64748b' },
  { id: 'applied', label: 'Applied', color: '#2563eb' },
  { id: 'interview', label: 'Interview', color: '#7c3aed' },
  { id: 'offer', label: 'Offer', color: '#059669' },
  { id: 'rejected', label: 'Rejected', color: '#e11d48' },
]

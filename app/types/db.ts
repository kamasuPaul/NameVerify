export type Role = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  created_at: string
}

export interface Invite {
  email: string
  full_name: string | null
  role: Role
  invited_by: string | null
  created_at: string
}

export interface List {
  id: string
  owner_id: string
  title: string
  created_at: string
}

export type LookupStatus = 'matched' | 'mismatch' | 'not_found' | 'error'

export interface ListRow {
  id: string
  list_id: string
  name: string
  phone: string
  amount: number
  telco_name: string | null
  lookup_status: LookupStatus | null
  position: number
}

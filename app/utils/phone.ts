import { parsePhoneNumberFromString } from 'libphonenumber-js'

// Normalize a raw Ugandan phone number to E.164 (e.g. "+256755030178").
// Accepts inputs like "0755030178", "+256755030178", "256-755-030-178",
// "755030178". Returns null if the input isn't a valid UG number.
export function normalizeUgandaPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = parsePhoneNumberFromString(trimmed, 'UG')
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

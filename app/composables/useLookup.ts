import type { LookupStatus } from '~/types/db'

export interface LookupResult {
  phone: string
  telcoName: string | null
  status: LookupStatus
  errorMessage?: string
}

interface LookupResponse {
  data?: { name?: string }
}

export function useLookup() {
  const config = useRuntimeConfig()
  const supabase = useSupabaseClient()

  async function lookupOne(phoneE164: string, expectedName?: string): Promise<LookupResult> {
    const base = String(config.public.coreCheckBaseUrl || '').replace(/\/+$/, '')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    if (!base || !token) {
      return {
        phone: phoneE164,
        telcoName: null,
        status: 'error',
        errorMessage: !base ? 'NUXT_PUBLIC_CORE_CHECK_BASE_URL not set' : 'No active session'
      }
    }

    try {
      const res = await $fetch<LookupResponse>(`${base}/lookup`, {
        query: { type: 'phone', value: phoneE164 },
        headers: { Authorization: `Bearer ${token}` }
      })
      const telcoName = res?.data?.name?.trim() || null
      if (!telcoName) return { phone: phoneE164, telcoName: null, status: 'not_found' }
      return {
        phone: phoneE164,
        telcoName,
        status: expectedName ? compareNames(expectedName, telcoName) : 'matched'
      }
    } catch (err) {
      const e = err as { status?: number, statusCode?: number, message?: string }
      if ((e.statusCode ?? e.status) === 404) {
        return { phone: phoneE164, telcoName: null, status: 'not_found' }
      }
      return {
        phone: phoneE164,
        telcoName: null,
        status: 'error',
        errorMessage: e.message
      }
    }
  }

  async function lookupMany(rows: Array<{ phone: string, name?: string }>, concurrency = 5) {
    const results: LookupResult[] = new Array(rows.length)
    let next = 0
    const workers = Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
      while (next < rows.length) {
        const idx = next++
        const row = rows[idx]!
        results[idx] = await lookupOne(row.phone, row.name)
      }
    })
    await Promise.all(workers)
    return results
  }

  return { lookupOne, lookupMany }
}

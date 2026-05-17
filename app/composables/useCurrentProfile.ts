import type { Profile } from '~/types/db'

export function useCurrentProfile() {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  const profile = useState<Profile | null>('current-profile', () => null)
  const loading = useState<boolean>('current-profile-loading', () => false)
  const error = useState<string | null>('current-profile-error', () => null)

  async function load() {
    if (!user.value) {
      profile.value = null
      return
    }
    if (profile.value?.id === user.value.id) return

    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single<Profile>()
    if (err) {
      error.value = err.message
      profile.value = null
    } else {
      profile.value = data
    }
    loading.value = false
  }

  watch(user, () => { load() }, { immediate: true })

  return { profile, loading, error, refresh: load }
}

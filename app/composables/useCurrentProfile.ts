import type { Profile } from '~/types/db'

export function useCurrentProfile() {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  const profile = useState<Profile | null>('current-profile', () => null)
  const loading = useState<boolean>('current-profile-loading', () => false)
  const error = useState<string | null>('current-profile-error', () => null)

  async function refresh() {
    if (!user.value) {
      profile.value = null
      return
    }

    // Force the supabase client to hydrate its session before querying,
    // otherwise the watcher may fire before auth is attached and the
    // SELECT goes out unauthenticated (RLS returns 0 rows → .single() errors).
    const { data: sess } = await supabase.auth.getSession()
    const session = sess.session
    if (!session) {
      profile.value = null
      return
    }

    if (profile.value?.id === session.user.id) return

    loading.value = true
    error.value = null
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single<Profile>()
    if (err) {
      error.value = err.message
      profile.value = null
    } else {
      profile.value = data
    }
    loading.value = false
  }

  watch(user, refresh, { immediate: true })

  return { profile, loading, error, refresh }
}

export default defineNuxtRouteMiddleware(async () => {
  const { profile, refresh } = useCurrentProfile()
  if (!profile.value) await refresh()
  if (profile.value?.role !== 'admin') {
    return navigateTo('/')
  }
})

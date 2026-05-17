<script setup lang="ts">
definePageMeta({
  layout: false,
  auth: false
})

const user = useSupabaseUser()
const route = useRoute()

const message = ref('Signing you in…')
const failed = ref(false)

// Surface OAuth errors that come back in the hash or query string
function extractError(): string | null {
  const fromQuery
    = (route.query.error_description as string | undefined)
      ?? (route.query.error as string | undefined)
  if (fromQuery) return decodeURIComponent(fromQuery)

  if (import.meta.client && window.location.hash) {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const desc = params.get('error_description') ?? params.get('error')
    if (desc) return decodeURIComponent(desc)
  }
  return null
}

watchEffect(async () => {
  if (user.value) {
    await navigateTo('/')
  }
})

onMounted(() => {
  const err = extractError()
  if (err) {
    failed.value = true
    message.value = err.includes('No invite found')
      ? 'Your email isn\'t invited. Ask an administrator to invite you.'
      : err
    return
  }

  // If we never get a user within a few seconds, the signup gate likely
  // rejected this email — the trigger raised but no error was attached
  // to the redirect (depends on Supabase auth flow). Show a fallback.
  setTimeout(() => {
    if (!user.value && !failed.value) {
      failed.value = true
      message.value = 'Sign-in didn\'t complete. Your email may not be invited.'
    }
  }, 4000)
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-elevated/25 px-4">
    <UPageCard class="w-full max-w-sm text-center" variant="subtle">
      <div class="flex flex-col items-center gap-3">
        <UIcon
          v-if="!failed"
          name="i-lucide-loader-circle"
          class="size-8 text-primary animate-spin"
        />
        <UIcon
          v-else
          name="i-lucide-circle-alert"
          class="size-8 text-error"
        />
        <p class="text-sm">
          {{ message }}
        </p>
        <UButton
          v-if="failed"
          to="/login"
          variant="subtle"
          size="sm"
        >
          Back to sign in
        </UButton>
      </div>
    </UPageCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  auth: false
})

const supabase = useSupabaseClient()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref<string | null>(
  route.query.error ? String(route.query.error) : null
)

async function signIn() {
  loading.value = true
  errorMessage.value = null

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/confirm`
    }
  })

  if (error) {
    errorMessage.value = error.message
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-elevated/25 px-4">
    <UPageCard class="w-full max-w-sm" variant="subtle">
      <div class="flex flex-col items-center gap-2 mb-6">
        <UIcon name="i-lucide-shield-check" class="size-10 text-primary" />
        <h1 class="text-xl font-semibold">
          Name Verify
        </h1>
        <p class="text-sm text-muted text-center">
          Sign in with the Google account you were invited with.
        </p>
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
        class="mb-4"
      />

      <UButton
        block
        color="neutral"
        size="lg"
        icon="i-simple-icons-google"
        :loading="loading"
        @click="signIn"
      >
        Continue with Google
      </UButton>
    </UPageCard>
  </div>
</template>

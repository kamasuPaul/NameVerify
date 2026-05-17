<script setup lang="ts">
const supabaseUser = useSupabaseUser()
const { profile } = useCurrentProfile()

const meta = computed(() => (supabaseUser.value?.user_metadata ?? {}) as Record<string, unknown>)
const avatarSrc = computed(() => (meta.value.avatar_url as string | undefined) || (meta.value.picture as string | undefined) || '')
</script>

<template>
  <UPageCard
    title="Profile"
    description="Signed-in identity from your Google account."
    variant="subtle"
  >
    <div class="flex items-center gap-4">
      <UAvatar :src="avatarSrc" :alt="profile?.full_name || supabaseUser?.email || ''" size="lg" />
      <div class="flex flex-col">
        <span class="font-medium">{{ profile?.full_name || supabaseUser?.email }}</span>
        <span class="text-sm text-muted">{{ supabaseUser?.email }}</span>
        <UBadge
          v-if="profile?.role"
          :color="profile.role === 'admin' ? 'primary' : 'neutral'"
          variant="subtle"
          size="sm"
          class="mt-1 w-fit capitalize"
        >
          {{ profile.role }}
        </UBadge>
      </div>
    </div>
  </UPageCard>
</template>

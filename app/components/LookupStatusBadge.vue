<script setup lang="ts">
import type { LookupStatus } from '~/types/db'

const props = defineProps<{
  status: LookupStatus | null | undefined
}>()

const meta = computed(() => {
  switch (props.status) {
    case 'matched':
      return { color: 'success' as const, label: 'Matched', icon: 'i-lucide-check' }
    case 'mismatch':
      return { color: 'warning' as const, label: 'Mismatch', icon: 'i-lucide-circle-alert' }
    case 'not_found':
      return { color: 'error' as const, label: 'Not found', icon: 'i-lucide-x' }
    case 'error':
      return { color: 'neutral' as const, label: 'Error', icon: 'i-lucide-triangle-alert' }
    default:
      return null
  }
})
</script>

<template>
  <UBadge v-if="meta" :color="meta.color" variant="subtle" size="sm">
    <UIcon :name="meta.icon" class="size-3.5 mr-1" />
    {{ meta.label }}
  </UBadge>
  <span v-else class="text-muted">—</span>
</template>

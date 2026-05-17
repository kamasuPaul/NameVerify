<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const { profile } = useCurrentProfile()

const links = computed(() => {
  const items: NavigationMenuItem[] = [
    {
      label: 'My Lists',
      icon: 'i-lucide-list-checks',
      to: '/',
      onSelect: () => { open.value = false }
    },
    {
      label: 'New List',
      icon: 'i-lucide-plus-circle',
      to: '/lists/new',
      onSelect: () => { open.value = false }
    }
  ]

  if (profile.value?.role === 'admin') {
    items.push({
      label: 'Members',
      icon: 'i-lucide-users',
      to: '/members',
      onSelect: () => { open.value = false }
    })
  }

  items.push({
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/settings',
    onSelect: () => { open.value = false }
  })

  return [items] satisfies NavigationMenuItem[][]
})

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.value.flat()
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 px-1" :class="collapsed ? 'justify-center' : ''">
          <UIcon name="i-lucide-shield-check" class="size-6 text-primary shrink-0" />
          <span v-if="!collapsed" class="font-semibold">Name Verify</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />
  </UDashboardGroup>
</template>

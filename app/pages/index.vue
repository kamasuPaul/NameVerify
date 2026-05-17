<script setup lang="ts">
import { format } from 'date-fns'

interface ListRow {
  id: string
  title: string
  created_at: string
  owner_id: string
  owner: { full_name: string | null, email: string } | null
}

const supabase = useSupabaseClient()
const { profile, refresh: refreshProfile } = useCurrentProfile()

const lists = ref<ListRow[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const isAdmin = computed(() => profile.value?.role === 'admin')

async function load() {
  loading.value = true
  errorMessage.value = null
  await refreshProfile()
  const { data, error } = await supabase
    .from('lists')
    .select('id, title, created_at, owner_id, owner:profiles!owner_id(full_name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    errorMessage.value = error.message
  } else {
    lists.value = (data ?? []) as unknown as ListRow[]
  }
  loading.value = false
}

onMounted(load)
</script>

<template>
  <UDashboardPanel id="lists">
    <template #header>
      <UDashboardNavbar title="My Lists">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/lists/new"
            icon="i-lucide-plus"
            label="New list"
            color="primary"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />

        <div v-if="loading" class="flex flex-col gap-2">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>

        <UPageCard
          v-else-if="!lists.length"
          title="No lists yet"
          description="Click 'New list' to add phone numbers, amounts, and names to verify against the telco registry."
          variant="subtle"
        />

        <div v-else class="border border-default rounded-lg overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50 text-left text-muted">
              <tr>
                <th class="px-3 py-2">Title</th>
                <th v-if="isAdmin" class="px-3 py-2">Owner</th>
                <th class="px-3 py-2 w-40">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="list in lists"
                :key="list.id"
                class="border-t border-default cursor-pointer hover:bg-elevated/30"
                @click="navigateTo(`/lists/${list.id}`)"
              >
                <td class="px-3 py-2 font-medium">
                  {{ list.title }}
                </td>
                <td v-if="isAdmin" class="px-3 py-2 text-muted">
                  {{ list.owner?.full_name || list.owner?.email || '—' }}
                </td>
                <td class="px-3 py-2 text-muted">
                  {{ format(new Date(list.created_at), 'PP') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

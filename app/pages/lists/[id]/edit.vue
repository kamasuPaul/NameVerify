<script setup lang="ts">
import type { ListRow, LookupStatus } from '~/types/db'

interface ListDetail {
  id: string
  title: string
  owner_id: string
  list_rows: ListRow[]
}

interface SubmitPayload {
  title: string
  rows: Array<{
    name: string
    phone: string
    amount: number
    telcoName: string | null
    status: LookupStatus | null
  }>
}

const route = useRoute()
const supabase = useSupabaseClient()
const supabaseUser = useSupabaseUser()
const { profile, refresh: refreshProfile } = useCurrentProfile()
const toast = useToast()

const id = computed(() => String(route.params.id))
const list = ref<ListDetail | null>(null)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const isAdmin = computed(() => profile.value?.role === 'admin')

const canEdit = computed(() => {
  if (!list.value) return false
  return isAdmin.value || list.value.owner_id === supabaseUser.value?.id
})

const orderedRows = computed(() =>
  [...(list.value?.list_rows ?? [])].sort((a, b) => a.position - b.position)
)

async function load() {
  loading.value = true
  errorMessage.value = null
  await refreshProfile()
  const { data, error } = await supabase
    .from('lists')
    .select('id, title, owner_id, list_rows(*)')
    .eq('id', id.value)
    .single()

  if (error) {
    errorMessage.value = error.message
    list.value = null
  } else {
    list.value = data as unknown as ListDetail
  }
  loading.value = false
}

onMounted(load)

async function onSave(payload: SubmitPayload) {
  if (!list.value || !canEdit.value) return
  saving.value = true
  const listId = list.value.id

  const { error: titleErr } = await supabase
    .from('lists')
    .update({ title: payload.title })
    .eq('id', listId)

  if (titleErr) {
    toast.add({
      title: 'Failed to update title',
      description: titleErr.message,
      color: 'error'
    })
    saving.value = false
    return
  }

  // Replace rows: simplest correct approach is delete-then-insert
  const { error: delErr } = await supabase
    .from('list_rows')
    .delete()
    .eq('list_id', listId)

  if (delErr) {
    toast.add({
      title: 'Failed to clear old rows',
      description: delErr.message,
      color: 'error'
    })
    saving.value = false
    return
  }

  const newRows = payload.rows.map((r, i) => ({
    list_id: listId,
    name: r.name,
    phone: r.phone,
    amount: r.amount,
    telco_name: r.telcoName,
    lookup_status: r.status,
    position: i
  }))

  const { error: insErr } = await supabase.from('list_rows').insert(newRows)

  if (insErr) {
    toast.add({
      title: 'Failed to save new rows',
      description: insErr.message,
      color: 'error'
    })
    saving.value = false
    return
  }

  toast.add({ title: 'List updated', color: 'success' })
  await navigateTo(`/lists/${listId}`)
}
</script>

<template>
  <UDashboardPanel id="edit-list">
    <template #header>
      <UDashboardNavbar :title="list?.title ? `Edit: ${list.title}` : 'Edit list'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            :to="`/lists/${id}`"
            variant="ghost"
            icon="i-lucide-arrow-left"
          >
            Cancel
          </UButton>
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

        <UAlert
          v-else-if="!loading && list && !canEdit"
          color="warning"
          variant="subtle"
          icon="i-lucide-lock"
          title="Read-only"
          description="You don't have permission to edit this list."
        />

        <div v-if="loading" class="flex flex-col gap-3">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>

        <ListEditor
          v-else-if="list && canEdit"
          :initial-title="list.title"
          :initial-rows="orderedRows"
          submit-label="Save changes"
          :submitting="saving"
          allow-unverified
          @submit="onSave"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

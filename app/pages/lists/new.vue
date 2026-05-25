<script setup lang="ts">
import type { LookupStatus } from '~/types/db'

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

const supabase = useSupabaseClient()
const toast = useToast()

const saving = ref(false)

async function onSave(payload: SubmitPayload) {
  saving.value = true

  const { data: sess } = await supabase.auth.getSession()
  const session = sess.session
  if (!session) {
    toast.add({
      title: 'Not signed in',
      description: 'Please refresh and try again.',
      color: 'error'
    })
    saving.value = false
    return
  }

  const { data: list, error: listErr } = await supabase
    .from('lists')
    .insert({
      owner_id: session.user.id,
      title: payload.title
    })
    .select('id')
    .single()

  if (listErr || !list) {
    toast.add({
      title: 'Failed to save list',
      description: listErr?.message,
      color: 'error'
    })
    saving.value = false
    return
  }

  const rowsPayload = payload.rows.map((r, i) => ({
    list_id: list.id,
    name: r.name,
    phone: r.phone,
    amount: r.amount,
    telco_name: r.telcoName,
    lookup_status: r.status,
    position: i
  }))

  const { error: rowsErr } = await supabase.from('list_rows').insert(rowsPayload)

  if (rowsErr) {
    toast.add({
      title: 'List saved but rows failed',
      description: rowsErr.message,
      color: 'error'
    })
    saving.value = false
    return
  }

  toast.add({ title: 'List saved', color: 'success' })
  await navigateTo(`/lists/${list.id}`)
}
</script>

<template>
  <UDashboardPanel id="new-list">
    <template #header>
      <UDashboardNavbar title="New list">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ListEditor :submitting="saving" @submit="onSave" />
    </template>
  </UDashboardPanel>
</template>

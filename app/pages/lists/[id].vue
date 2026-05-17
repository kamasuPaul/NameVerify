<script setup lang="ts">
import { format } from 'date-fns'
import type { ListRow, LookupStatus } from '~/types/db'

interface ListDetail {
  id: string
  title: string
  created_at: string
  owner_id: string
  owner: { full_name: string | null, email: string } | null
  list_rows: ListRow[]
}

const route = useRoute()
const supabase = useSupabaseClient()
const { profile, refresh: refreshProfile } = useCurrentProfile()
const { exportExcel, exportPdf } = useListExport()
const toast = useToast()

const exporting = ref(false)

async function onExport(kind: 'excel' | 'pdf') {
  if (!list.value) return
  exporting.value = true
  try {
    const ctx = {
      title: list.value.title,
      createdAt: list.value.created_at,
      rows: orderedRows.value
    }
    if (kind === 'excel') await exportExcel(ctx)
    else await exportPdf(ctx)
  } catch (e) {
    const err = e as Error
    toast.add({
      title: `Export failed`,
      description: err.message,
      color: 'error'
    })
  } finally {
    exporting.value = false
  }
}

const id = computed(() => String(route.params.id))
const list = ref<ListDetail | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const isAdmin = computed(() => profile.value?.role === 'admin')

const orderedRows = computed(() =>
  [...(list.value?.list_rows ?? [])].sort((a, b) => a.position - b.position)
)

const summary = computed(() => {
  const counts: Record<LookupStatus, number> = { matched: 0, mismatch: 0, not_found: 0, error: 0 }
  for (const r of orderedRows.value) {
    if (r.lookup_status) counts[r.lookup_status]++
  }
  return counts
})

const totalAmount = computed(() =>
  orderedRows.value.reduce((sum, r) => sum + Number(r.amount), 0)
)

async function load() {
  loading.value = true
  errorMessage.value = null
  await refreshProfile()
  const { data, error } = await supabase
    .from('lists')
    .select('id, title, created_at, owner_id, owner:profiles!owner_id(full_name, email), list_rows(*)')
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
</script>

<template>
  <UDashboardPanel id="list-detail">
    <template #header>
      <UDashboardNavbar :title="list?.title || 'List'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/"
            variant="ghost"
            icon="i-lucide-arrow-left"
          >
            Back
          </UButton>
          <UButton
            variant="subtle"
            icon="i-lucide-file-spreadsheet"
            :loading="exporting"
            :disabled="!list || !orderedRows.length"
            @click="onExport('excel')"
          >
            Export Excel
          </UButton>
          <UButton
            variant="subtle"
            icon="i-lucide-file-text"
            :loading="exporting"
            :disabled="!list || !orderedRows.length"
            @click="onExport('pdf')"
          >
            Export PDF
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 max-w-5xl">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />

        <p v-if="loading" class="text-sm text-muted">
          Loading…
        </p>

        <template v-else-if="list">
          <UPageCard variant="subtle">
            <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span class="text-muted">Created: </span>
                <span>{{ format(new Date(list.created_at), 'PPpp') }}</span>
              </div>
              <div v-if="isAdmin">
                <span class="text-muted">Owner: </span>
                <span>{{ list.owner?.full_name || list.owner?.email || '—' }}</span>
              </div>
              <div>
                <span class="text-muted">Rows: </span>
                <span>{{ orderedRows.length }}</span>
              </div>
              <div>
                <span class="text-muted">Total: </span>
                <span>{{ totalAmount.toLocaleString() }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 mt-3 text-sm">
              <div class="flex items-center gap-2">
                <UBadge color="success" variant="subtle">
                  {{ summary.matched }}
                </UBadge>
                <span>matched</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="warning" variant="subtle">
                  {{ summary.mismatch }}
                </UBadge>
                <span>mismatch</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="error" variant="subtle">
                  {{ summary.not_found }}
                </UBadge>
                <span>not found</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="subtle">
                  {{ summary.error }}
                </UBadge>
                <span>error</span>
              </div>
            </div>
          </UPageCard>

          <div class="border border-default rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-elevated/50 text-left text-muted">
                <tr>
                  <th class="px-3 py-2 w-10">#</th>
                  <th class="px-3 py-2">Name</th>
                  <th class="px-3 py-2">Phone</th>
                  <th class="px-3 py-2 w-32">Amount</th>
                  <th class="px-3 py-2">Telco name</th>
                  <th class="px-3 py-2 w-32">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in orderedRows"
                  :key="row.id"
                  class="border-t border-default"
                >
                  <td class="px-3 py-2 text-muted">
                    {{ i + 1 }}
                  </td>
                  <td class="px-3 py-2">
                    {{ row.name }}
                  </td>
                  <td class="px-3 py-2 font-mono">
                    {{ row.phone }}
                  </td>
                  <td class="px-3 py-2">
                    {{ Number(row.amount).toLocaleString() }}
                  </td>
                  <td class="px-3 py-2">
                    {{ row.telco_name || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    <LookupStatusBadge :status="row.lookup_status" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

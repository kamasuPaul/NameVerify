<script setup lang="ts">
import type { LookupStatus } from '~/types/db'

interface DraftRow {
  id: string
  name: string
  phone: string
  amount: string
  phoneE164?: string | null
  telcoName?: string | null
  status?: LookupStatus
  errorMessage?: string
}

function newRow(): DraftRow {
  return { id: crypto.randomUUID(), name: '', phone: '', amount: '' }
}

const title = ref('')
const rows = ref<DraftRow[]>([newRow()])
const verifying = ref(false)

const { lookupMany } = useLookup()

function isRowReady(r: DraftRow): boolean {
  const amount = Number(r.amount)
  console.log(r)
  return !!(
    r.name.trim()
    && r.phone.trim()
    && normalizeUgandaPhone(r.phone)
    && !Number.isNaN(amount)
    && amount > 0
  )
}

const allRowsReady = computed(
  () => rows.value.length > 0 && rows.value.every(isRowReady)
)

const hasVerified = computed(() => rows.value.some(r => r.status))

const summary = computed(() => {
  const counts = { matched: 0, mismatch: 0, not_found: 0, error: 0 }
  for (const r of rows.value) {
    if (r.status) counts[r.status]++
  }
  return counts
})

function addRow() {
  rows.value.push(newRow())
}

function removeRow(id: string) {
  rows.value = rows.value.filter(r => r.id !== id)
  if (rows.value.length === 0) addRow()
}

async function verify() {
  verifying.value = true
  const ready = rows.value.filter(isRowReady)
  const results = await lookupMany(
    ready.map(r => ({ phone: normalizeUgandaPhone(r.phone)!, name: r.name }))
  )
  // Map results back by index within `ready`
  results.forEach((res, i) => {
    const row = ready[i]!
    row.phoneE164 = res.phone
    row.telcoName = res.telcoName
    row.status = res.status
    row.errorMessage = res.errorMessage
  })
  verifying.value = false
}
</script>

<template>
  <UDashboardPanel id="new-list">
    <template #header>
      <UDashboardNavbar title="New list">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            color="primary"
            :loading="verifying"
            :disabled="!allRowsReady"
            @click="verify"
          >
            Verify
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 max-w-5xl">
        <UFormField label="Title">
          <UInput v-model="title" placeholder="e.g. Payroll — May 2026" />
        </UFormField>

        <div class="border border-default rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-elevated/50 text-left text-muted">
              <tr>
                <th class="px-3 py-2 w-10">#</th>
                <th class="px-3 py-2">Name</th>
                <th class="px-3 py-2">Phone</th>
                <th class="px-3 py-2 w-32">Amount</th>
                <th v-if="hasVerified" class="px-3 py-2">Telco name</th>
                <th v-if="hasVerified" class="px-3 py-2 w-32">Status</th>
                <th class="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in rows"
                :key="row.id"
                class="border-t border-default align-top"
              >
                <td class="px-3 py-2 text-muted">
                  {{ i + 1 }}
                </td>
                <td class="px-3 py-2">
                  <UInput v-model="row.name" placeholder="Full name" class="w-full" />
                </td>
                <td class="px-3 py-2">
                  <UInput v-model="row.phone" placeholder="0755030178" class="w-full" />
                  <p
                    v-if="row.phone && !normalizeUgandaPhone(row.phone)"
                    class="text-xs text-error mt-1"
                  >
                    Invalid UG number
                  </p>
                </td>
                <td class="px-3 py-2">
                  <UInput
                    v-model="row.amount"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full"
                  />
                </td>
                <td v-if="hasVerified" class="px-3 py-2">
                  {{ row.telcoName || (row.status ? '—' : '') }}
                </td>
                <td v-if="hasVerified" class="px-3 py-2">
                  <LookupStatusBadge :status="row.status" />
                  <p
                    v-if="row.errorMessage"
                    class="text-xs text-muted mt-1 truncate max-w-[12rem]"
                    :title="row.errorMessage"
                  >
                    {{ row.errorMessage }}
                  </p>
                </td>
                <td class="px-3 py-2">
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    @click="removeRow(row.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <UButton
            variant="ghost"
            icon="i-lucide-plus"
            @click="addRow"
          >
            Add row
          </UButton>
        </div>

        <UPageCard v-if="hasVerified" variant="subtle">
          <div class="flex flex-wrap gap-3 text-sm">
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
      </div>
    </template>
  </UDashboardPanel>
</template>

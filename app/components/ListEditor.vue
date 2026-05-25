<script setup lang="ts">
import type { LookupStatus } from '~/types/db'

interface InitialRow {
  name: string
  phone: string
  amount: number | string
  telco_name?: string | null
  lookup_status?: LookupStatus | null
}

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

const props = withDefaults(defineProps<{
  initialTitle?: string
  initialRows?: InitialRow[]
  submitLabel?: string
  submitting?: boolean
  // When true (edit mode), rows may be saved without a current lookup status —
  // useful for tweaking saved lists without forcing a full re-verify.
  allowUnverified?: boolean
}>(), {
  initialTitle: '',
  initialRows: () => [],
  submitLabel: 'Save list',
  submitting: false,
  allowUnverified: false
})

const emit = defineEmits<{
  submit: [SubmitPayload]
}>()

function makeDraft(initial?: InitialRow): DraftRow {
  if (!initial) {
    return { id: crypto.randomUUID(), name: '', phone: '', amount: '' }
  }
  return {
    id: crypto.randomUUID(),
    name: initial.name,
    phone: initial.phone,
    amount: String(initial.amount),
    phoneE164: normalizeUgandaPhone(initial.phone),
    telcoName: initial.telco_name ?? null,
    status: initial.lookup_status ?? undefined
  }
}

const title = ref(props.initialTitle)
const rows = ref<DraftRow[]>(
  props.initialRows.length
    ? props.initialRows.map(r => makeDraft(r))
    : [makeDraft()]
)
const verifying = ref(false)

const { lookupMany } = useLookup()

function isRowReady(r: DraftRow): boolean {
  const amount = Number(r.amount)
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

const allRowsVerified = computed(
  () => rows.value.length > 0 && rows.value.every(r => r.status && r.phoneE164)
)

const canSubmit = computed(() => {
  if (props.submitting) return false
  if (!title.value.trim()) return false
  if (rows.value.length === 0) return false
  if (props.allowUnverified) return rows.value.every(isRowReady)
  return allRowsVerified.value
})

const summary = computed(() => {
  const counts = { matched: 0, mismatch: 0, not_found: 0, error: 0 }
  for (const r of rows.value) {
    if (r.status) counts[r.status]++
  }
  return counts
})

function addRow() {
  rows.value.push(makeDraft())
}

function removeRow(id: string) {
  rows.value = rows.value.filter(r => r.id !== id)
  if (rows.value.length === 0) addRow()
}

// Editing any of name/phone/amount invalidates a row's prior verification —
// forces re-verify before save.
function invalidate(row: DraftRow) {
  row.phoneE164 = null
  row.telcoName = null
  row.status = undefined
  row.errorMessage = undefined
}

async function verify() {
  verifying.value = true
  const ready = rows.value.filter(isRowReady)
  const results = await lookupMany(
    ready.map(r => ({ phone: normalizeUgandaPhone(r.phone)!, name: r.name }))
  )
  results.forEach((res, i) => {
    const row = ready[i]!
    row.phoneE164 = res.phone
    row.telcoName = res.telcoName
    row.status = res.status
    row.errorMessage = res.errorMessage
  })
  verifying.value = false
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    title: title.value.trim(),
    rows: rows.value.map(r => ({
      name: r.name.trim(),
      phone: normalizeUgandaPhone(r.phone)!,
      amount: Number(r.amount),
      telcoName: r.telcoName ?? null,
      status: r.status ?? null
    }))
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-5xl">
    <div class="flex flex-wrap gap-2 justify-end">
      <UButton
        variant="subtle"
        :loading="submitting"
        :disabled="!canSubmit"
        @click="submit"
      >
        {{ submitLabel }}
      </UButton>
      <UButton
        color="primary"
        :loading="verifying"
        :disabled="!allRowsReady"
        @click="verify"
      >
        Verify
      </UButton>
    </div>

    <UFormField label="Title" required>
      <UInput v-model="title" placeholder="e.g. Payroll — May 2026" />
    </UFormField>

    <div class="border border-default rounded-lg overflow-x-auto">
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
              <UInput
                v-model="row.name"
                placeholder="Full name"
                class="w-full"
                @update:model-value="invalidate(row)"
              />
            </td>
            <td class="px-3 py-2">
              <UInput
                v-model="row.phone"
                placeholder="0755030178"
                class="w-full"
                @update:model-value="invalidate(row)"
              />
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
                @update:model-value="invalidate(row)"
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

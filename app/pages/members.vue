<script setup lang="ts">
import { format } from 'date-fns'
import type { Profile, Invite, Role } from '~/types/db'

definePageMeta({ middleware: 'admin' })

const supabase = useSupabaseClient()
const supabaseUser = useSupabaseUser()
const toast = useToast()

const profiles = ref<Profile[]>([])
const invites = ref<Invite[]>([])
const loading = ref(true)
const inviteOpen = ref(false)
const updatingProfileId = ref<string | null>(null)

const roleItems = [
  { label: 'User', value: 'user' as Role },
  { label: 'Admin', value: 'admin' as Role }
]

async function load() {
  loading.value = true
  const [{ data: ps, error: pErr }, { data: is, error: iErr }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('invites').select('*').order('created_at', { ascending: false })
  ])
  if (pErr) toast.add({ title: 'Failed to load members', description: pErr.message, color: 'error' })
  if (iErr) toast.add({ title: 'Failed to load invites', description: iErr.message, color: 'error' })
  profiles.value = (ps ?? []) as Profile[]
  invites.value = (is ?? []) as Invite[]
  loading.value = false
}

onMounted(load)

async function changeRole(p: Profile, newRole: Role) {
  if (p.id === supabaseUser.value?.id) return
  if (p.role === newRole) return
  const previous = p.role
  p.role = newRole
  updatingProfileId.value = p.id

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', p.id)

  updatingProfileId.value = null

  if (error) {
    p.role = previous
    toast.add({
      title: 'Failed to update role',
      description: error.message,
      color: 'error'
    })
    return
  }
  toast.add({ title: 'Role updated', color: 'success' })
}

async function cancelInvite(email: string) {
  const { error } = await supabase.from('invites').delete().eq('email', email)
  if (error) {
    toast.add({
      title: 'Failed to cancel invite',
      description: error.message,
      color: 'error'
    })
    return
  }
  invites.value = invites.value.filter(i => i.email !== email)
  toast.add({ title: 'Invite cancelled', color: 'success' })
}
</script>

<template>
  <UDashboardPanel id="members">
    <template #header>
      <UDashboardNavbar title="Members">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-user-plus"
            color="primary"
            @click="inviteOpen = true"
          >
            Add user
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 max-w-5xl">
        <div v-if="loading" class="flex flex-col gap-2">
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
          <USkeleton class="h-10 w-full" />
        </div>

        <template v-else>
          <section class="flex flex-col gap-2">
            <h2 class="text-sm text-muted">
              Members ({{ profiles.length }})
            </h2>
            <div class="border border-default rounded-lg overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-elevated/50 text-left text-muted">
                  <tr>
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2">Email</th>
                    <th class="px-3 py-2 w-32">Role</th>
                    <th class="px-3 py-2 w-32">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="p in profiles"
                    :key="p.id"
                    class="border-t border-default"
                  >
                    <td class="px-3 py-2">
                      {{ p.full_name || '—' }}
                      <UBadge
                        v-if="p.id === supabaseUser?.sub"
                        color="neutral"
                        variant="subtle"
                        size="sm"
                        class="ml-1"
                      >
                        you
                      </UBadge>
                    </td>
                    <td class="px-3 py-2 text-muted">
                      {{ p.email }}
                    </td>
                    <td class="px-3 py-2">
                      <USelect
                        :model-value="p.role"
                        :items="roleItems"
                        :disabled="p.id === supabaseUser?.sub || updatingProfileId === p.id"
                        size="sm"
                        @update:model-value="(v) => changeRole(p, v as Role)"
                      />
                    </td>
                    <td class="px-3 py-2 text-muted">
                      {{ format(new Date(p.created_at), 'PP') }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="invites.length" class="flex flex-col gap-2">
            <h2 class="text-sm text-muted">
              Pending invites ({{ invites.length }})
            </h2>
            <div class="border border-default rounded-lg overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-elevated/50 text-left text-muted">
                  <tr>
                    <th class="px-3 py-2">Email</th>
                    <th class="px-3 py-2">Name</th>
                    <th class="px-3 py-2 w-24">Role</th>
                    <th class="px-3 py-2 w-32">Invited</th>
                    <th class="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="inv in invites"
                    :key="inv.email"
                    class="border-t border-default"
                  >
                    <td class="px-3 py-2">
                      {{ inv.email }}
                    </td>
                    <td class="px-3 py-2 text-muted">
                      {{ inv.full_name || '—' }}
                    </td>
                    <td class="px-3 py-2 capitalize">
                      {{ inv.role }}
                    </td>
                    <td class="px-3 py-2 text-muted">
                      {{ format(new Date(inv.created_at), 'PP') }}
                    </td>
                    <td class="px-3 py-2">
                      <UButton
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        icon="i-lucide-x"
                        title="Cancel invite"
                        @click="cancelInvite(inv.email)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <InviteUserModal v-model:open="inviteOpen" @invited="load" />
        </template>

      </div>
    </template>

  </UDashboardPanel>
</template>

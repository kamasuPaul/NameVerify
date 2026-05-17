<script setup lang="ts">
import type { Role } from '~/types/db'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'invited': []
}>()

const supabase = useSupabaseClient()
const supabaseUser = useSupabaseUser()
const toast = useToast()

const email = ref('')
const fullName = ref('')
const role = ref<Role>('user')
const submitting = ref(false)

const roleItems = [
  { label: 'User', value: 'user' as Role },
  { label: 'Admin', value: 'admin' as Role }
]

const emailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
)

function reset() {
  email.value = ''
  fullName.value = ''
  role.value = 'user'
}

function onOpenChange(value: boolean) {
  if (!value) reset()
  emit('update:open', value)
}

async function submit() {
  if (!emailValid.value || submitting.value) return
  submitting.value = true

  const { error } = await supabase.from('invites').insert({
    email: email.value.trim().toLowerCase(),
    full_name: fullName.value.trim() || null,
    role: role.value,
    invited_by: supabaseUser.value?.id
  })

  submitting.value = false

  if (error) {
    if (error.code === '23505') {
      toast.add({
        title: 'Already invited',
        description: 'An invite for that email already exists.',
        color: 'warning'
      })
    } else {
      toast.add({
        title: 'Invite failed',
        description: error.message,
        color: 'error'
      })
    }
    return
  }

  toast.add({
    title: 'User added',
    description: `${email.value} can now sign in with Google.`,
    color: 'success'
  })
  emit('invited')
  onOpenChange(false)
}
</script>

<template>
  <UModal
    :open="open"
    title="Add user"
    @update:open="onOpenChange"
  >
    <template #body>
      <div class="flex flex-col gap-2">
        <UFormField label="Email" required>
          <UInput v-model="email" type="email" placeholder="name@example.com" class="w-full" />
        </UFormField>
        <UFormField label="Full name">
          <UInput v-model="fullName" placeholder="Optional — used as their display name" class="w-full" />
        </UFormField>
        <UFormField label="Role" required>
          <USelect v-model="role" :items="roleItems" class="w-full" />
        </UFormField>
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="Google sign-in"
          description="They must sign in with the Google account that matches this email."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" @click="onOpenChange(false)">
          Cancel
        </UButton>
        <UButton
          :loading="submitting"
          :disabled="!emailValid"
          @click="submit"
        >
          Add user
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
useDashboard()
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
      <UPageCard
        title="No lists yet"
        description="Lists you create will appear here. Click 'New list' to add phone numbers, amounts, and names to verify against the telco registry."
        variant="subtle"
      />
    </template>
  </UDashboardPanel>
</template>

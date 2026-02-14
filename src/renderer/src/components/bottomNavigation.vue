<script lang="ts" setup></script>

<template>
  <div class="position">
    <n-divider class="n-divider" />
    <n-space class="n-space" justify="space-between">
      <n-space>
        <n-button
          quaternary
          circle
          @click="$router.push('/ZImageGenerate')"
          :title="$t('BottomNavigation.generator')"
        >
          {{ $t("BottomNavigation.generator") }}
        </n-button>
      </n-space>

      <n-space>
        <n-button
          quaternary
          circle
          @click="$router.push('/ZImageSettings')"
          :title="$t('BottomNavigation.settings')"
        >
          {{ $t("BottomNavigation.settings") }}
        </n-button>
      </n-space>
    </n-space>
  </div>
</template>

<style lang="scss" scoped>
.position {
  box-sizing: border-box;
  width: 100%;
  height: 60px;
  justify-content: flex-end;
}

.n-space {
  box-sizing: border-box;
  margin: 10px 20px 0 20px;
}

.n-divider {
  margin: 0 !important;
}
</style>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="app-header">
      <q-toolbar class="page-width">
        <router-link class="brand-link" to="/" aria-label="Ir para a página inicial">
          <span class="brand-mark">
            <q-icon name="auto_awesome" size="22px" />
          </span>
          <span class="brand-copy">
            <span class="brand-name">O Colapso da Fé</span>
            <span class="brand-caption">Uma jornada de escolhas</span>
          </span>
        </router-link>

        <q-space />

        <template v-if="session.token">
          <div class="header-player gt-xs">
            <q-icon name="person" />
            <span>{{ session.user?.nome || 'Aventureiro' }}</span>
          </div>
          <q-btn
            flat
            round
            icon="logout"
            aria-label="Sair da conta"
            class="header-logout"
            @click="logout"
          >
            <q-tooltip>Sair da conta</q-tooltip>
          </q-btn>
        </template>

        <template v-else>
          <q-btn flat no-caps label="Entrar" to="/login" class="header-login" />
          <q-btn unelevated no-caps label="Criar conta" to="/cadastro" class="header-register" />
        </template>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { clearSession, session } from '@/services/session'

const router = useRouter()

function handleAuthExpired() {
  clearSession()
  if (router.currentRoute.value.path !== '/login') {
    router.replace('/login')
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', handleAuthExpired)
  onUnmounted(() => window.removeEventListener('auth:expired', handleAuthExpired))
}

function logout() {
  clearSession()
  router.push('/')
}
</script>

<style scoped>
.app-header {
  background: rgba(15, 17, 15, 0.94);
  border-bottom: 1px solid rgba(226, 190, 143, 0.13);
  backdrop-filter: blur(18px);
}

.page-width {
  width: min(100% - 40px, 1160px);
  min-height: 76px;
  margin: 0 auto;
  padding: 0;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #f0bf7a;
  border: 1px solid rgba(240, 191, 122, 0.45);
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(164, 94, 55, 0.24), rgba(31, 33, 28, 0.5));
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.brand-name {
  color: #f7efe3;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: 0.02em;
}

.brand-caption {
  color: #a9a293;
  font-size: 11px;
}

.header-player {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
  color: #d6c9b5;
  font-size: 13px;
}

.header-logout {
  color: #c9bda9;
}

.header-login {
  color: #e8dccb;
}

.header-register {
  padding: 9px 16px;
  color: #1b1712;
  border-radius: 10px;
  background: #e9b86f;
  font-weight: 700;
}

@media (max-width: 599px) {
  .page-width {
    width: calc(100% - 28px);
    min-height: 68px;
  }

  .brand-caption {
    display: none;
  }
}
</style>

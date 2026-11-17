<template>
  <q-page class="auth-page flex flex-center">
    <q-card class="auth-card">
      <q-card-section>
        <div class="text-h5 text-weight-bold">Entrar</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="onLogin">
          <q-input
            v-model="email"
            type="email"
            label="E-mail"
            autocomplete="email"
            outlined
            dark
            lazy-rules
            :rules="[
              (value) => !!value || 'Informe o e-mail',
              (value) => /.+@.+\..+/.test(value) || 'E-mail inválido',
            ]"
          />

          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Senha"
            autocomplete="current-password"
            outlined
            dark
            lazy-rules
            :rules="[(value) => !!value || 'Informe a senha']"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-btn
            type="submit"
            label="Entrar"
            color="deep-orange-8"
            no-caps
            unelevated
            class="full-width"
            :loading="isLoading"
            :disable="isLoading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <router-link to="/cadastro" class="auth-link">Ainda não tem conta? Cadastre-se</router-link>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '@/services/api'
import { saveSession } from '@/services/session'

const $q = useQuasar()
const router = useRouter()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)

async function onLogin() {
  isLoading.value = true
  try {
    const response = await api.login(email.value.trim(), password.value)
    if (!response?.token) {
      throw new Error('A API não retornou um token de acesso.')
    }

    saveSession(response.token, response.user || null)
    await router.push('/')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Não foi possível entrar. Tente novamente.',
      position: 'top',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  background: #1b1714;
}

.auth-card {
  width: 100%;
  max-width: 380px;
  background: #26201b;
  color: #f1e6d6;
  border: 1px solid #4a3b2f;
}

.auth-link {
  color: #e6a15c;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>

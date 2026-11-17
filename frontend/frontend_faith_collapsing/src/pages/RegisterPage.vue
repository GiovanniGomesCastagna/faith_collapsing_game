<template>
  <q-page class="auth-page flex flex-center">
    <q-card class="auth-card">
      <q-card-section>
        <div class="text-h5 text-weight-bold">Criar conta</div>
        <div class="form-subtitle">Prepare-se para começar sua jornada.</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="register">
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
            v-model="name"
            label="Nome"
            autocomplete="name"
            outlined
            dark
            lazy-rules
            :rules="[(value) => !!value.trim() || 'Informe o nome']"
          />

          <q-input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Senha"
            autocomplete="new-password"
            outlined
            dark
            lazy-rules
            :rules="[
              (value) => !!value || 'Informe a senha',
              (value) => value.length >= 8 || 'A senha deve ter ao menos 8 caracteres',
            ]"
          >
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-input
            v-model="passwordConfirmation"
            :type="showPassword ? 'text' : 'password'"
            label="Confirmar senha"
            autocomplete="new-password"
            outlined
            dark
            lazy-rules
            :rules="[
              (value) => !!value || 'Confirme a senha',
              (value) => value === password || 'As senhas não coincidem',
            ]"
          />

          <div class="class-picker">
            <div class="class-label">Escolha sua classe</div>
            <div class="class-options">
              <q-btn
                v-for="classOption in classes"
                :key="classOption.value"
                type="button"
                no-caps
                unelevated
                :icon="classOption.icon"
                :label="classOption.label"
                :aria-pressed="selectedClass === classOption.value"
                class="class-option"
                :class="{ 'class-option-selected': selectedClass === classOption.value }"
                @click="selectClass(classOption.value)"
              />
            </div>
            <div v-if="showClassError" class="class-error">Escolha uma classe para continuar.</div>
          </div>

          <q-btn
            type="submit"
            label="Criar conta"
            color="deep-orange-8"
            no-caps
            unelevated
            class="full-width submit-button"
            :loading="isLoading"
            :disable="isLoading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <router-link to="/login" class="auth-link">Já tem conta? Faça login</router-link>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from '@/services/api'

const $q = useQuasar()
const router = useRouter()
const email = ref('')
const name = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const selectedClass = ref('')
const showPassword = ref(false)
const showClassError = ref(false)
const isLoading = ref(false)

const classes = [
  { label: 'Guerreiro', value: 'guerreiro', icon: 'shield' },
  { label: 'Mago', value: 'mago', icon: 'auto_awesome' },
  { label: 'Bandido', value: 'bandido', icon: 'bolt' },
]

function selectClass(value) {
  selectedClass.value = value
  showClassError.value = false
}

async function register() {
  if (!selectedClass.value) {
    showClassError.value = true
    return
  }

  isLoading.value = true
  try {
    await api.register({
      email: email.value.trim(),
      nome: name.value.trim(),
      senha: password.value,
      senha_confirm: passwordConfirmation.value,
      classe: selectedClass.value,
    })
    $q.notify({ type: 'positive', message: 'Conta criada com sucesso.', position: 'top' })
    await router.push('/login')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'Não foi possível criar a conta. Tente novamente.',
      position: 'top',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 76px);
  padding: 32px 16px;
  background: #1b1714;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: #26201b;
  color: #f1e6d6;
  border: 1px solid #4a3b2f;
}

.form-subtitle {
  margin-top: 6px;
  color: #a99b89;
  font-size: 13px;
}

.class-picker {
  display: grid;
  gap: 9px;
}

.class-label {
  color: #e8ddcf;
  font-size: 14px;
}

.class-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.class-option {
  min-height: 48px;
  color: #d3c4b2;
  border: 1px solid #544437;
  border-radius: 8px;
  background: #211b17;
  font-size: 12px;
}

.class-option-selected {
  color: #ffcf96;
  border-color: #df8d4a;
  background: rgba(222, 125, 56, 0.18);
}

.class-error {
  color: #ff8a80;
  font-size: 12px;
}

.submit-button {
  min-height: 44px;
}

.auth-link {
  color: #e6a15c;
  text-decoration: none;
}

.auth-link:hover {
  text-decoration: underline;
}
</style>

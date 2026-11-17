<template>
  <q-page class="home-page">
    <main v-if="!session.token" class="guest-page">
      <div class="eyebrow">UMA AVENTURA DE ESCOLHAS</div>
      <h1>Quando a fé desmorona,<br /><span>quem você se torna?</span></h1>
      <p>Atravesse encontros, enfrente criaturas e descubra até onde você iria para sobreviver.</p>
      <div class="guest-actions">
        <q-btn unelevated no-caps label="Criar conta" to="/cadastro" class="primary-button" />
        <q-btn flat no-caps label="Entrar" to="/login" class="secondary-button" />
      </div>
    </main>

    <main v-else-if="profileLoading" class="loading-state">
      <q-spinner-orbit color="primary" size="42px" />
      <span>Carregando seu perfil…</span>
    </main>

    <main v-else-if="session.user" class="dashboard">
      <header class="dashboard-heading">
        <div>
          <div class="eyebrow">SUA PRÓXIMA JORNADA</div>
          <h1>Bem-vindo, {{ session.user.nome }}</h1>
          <p>Prepare-se e escolha a dificuldade do seu caminho.</p>
        </div>
      </header>

      <q-banner v-if="pageError" rounded class="error-banner">
        <template #avatar><q-icon name="cloud_off" /></template>
        {{ pageError }}
        <template #action>
          <q-btn flat no-caps label="Tentar novamente" @click="loadProfile" />
        </template>
      </q-banner>

      <q-banner v-if="hasActiveGame" rounded class="continue-banner">
        <template #avatar><q-icon name="explore" /></template>
        Você tem uma jornada em andamento.
        <template #action>
          <q-btn flat no-caps label="Continuar jornada" :disable="givingUp" @click="continueGame" />
          <q-btn
            flat
            no-caps
            label="Desistir da jornada"
            class="abandon-journey-button"
            :disable="givingUp"
            @click="giveUpDialog = true"
          />
        </template>
      </q-banner>

      <section v-if="!pageError" class="four-part-layout" aria-label="Perfil e dificuldades">
        <q-card flat class="info-card">
          <div class="card-eyebrow">PERSONAGEM</div>
          <div class="class-name">{{ className(session.user.classe) }}</div>
          <div class="level-label">
            <q-icon name="military_tech" />
            Nível {{ session.user.nivel }}
          </div>

          <div class="stat-group">
            <div class="stat-heading">
              <span><q-icon name="favorite" /> Vida</span>
              <strong
                >{{ session.user.vida }} <small>/ {{ session.user.vida_total }}</small></strong
              >
            </div>
            <q-linear-progress
              rounded
              size="8px"
              :value="healthRatio"
              color="negative"
              track-color="grey-9"
            />
          </div>

          <div class="stat-group">
            <div class="stat-heading">
              <span><q-icon name="auto_awesome" /> Experiência</span>
              <strong>{{ session.user.xp }} <small>/ 1000 XP</small></strong>
            </div>
            <q-linear-progress
              rounded
              size="6px"
              :value="xpRatio"
              color="warning"
              track-color="grey-9"
            />
          </div>

          <div class="combat-stats">
            <div>
              <q-icon name="swords" /><span>Ataque</span><strong>{{ session.user.ataque }}</strong>
            </div>
            <div>
              <q-icon name="shield" /><span>Defesa</span><strong>{{ session.user.defesa }}</strong>
            </div>
          </div>

          <q-btn
            unelevated
            no-caps
            icon="favorite"
            label="Trocar XP por vida"
            class="heal-button full-width"
            :loading="healing"
            :disable="healing || Number(session.user.vida) >= Number(session.user.vida_total)"
            @click="convertXPToHealth"
          />
        </q-card>

        <q-card
          v-for="option in difficultyOptions"
          :key="option.value"
          flat
          class="difficulty-card"
          :class="`difficulty-${option.value}`"
        >
          <div class="difficulty-icon"><q-icon :name="option.icon" /></div>
          <div class="card-eyebrow">DIFICULDADE</div>
          <h2>{{ option.label }}</h2>
          <p>{{ option.description }}</p>
          <div class="difficulty-level">{{ option.levelText }}</div>
          <q-btn
            unelevated
            no-caps
            :label="`Jogar ${option.label.toLowerCase()}`"
            class="difficulty-button full-width"
            :loading="difficultyBusy === option.value"
            :disable="difficultyBusy !== null || hasActiveGame"
            @click="startGame(option.value)"
          />
        </q-card>
      </section>
    </main>

    <main v-else class="loading-state">
      <q-icon name="error_outline" size="34px" color="warning" />
      <span>{{ pageError || 'Não foi possível carregar seu perfil.' }}</span>
      <q-btn flat no-caps label="Tentar novamente" @click="loadProfile" />
    </main>

    <q-dialog v-model="giveUpDialog">
      <q-card class="confirmation-card">
        <q-card-section>
          <div class="eyebrow">ENCERRAR JORNADA</div>
          <div class="dialog-title">Desistir desta jornada?</div>
          <p>Seu progresso nesta jornada será encerrado. Esta ação não pode ser desfeita.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            no-caps
            label="Continuar jornada"
            class="secondary-button"
            :disable="givingUp"
            v-close-popup
          />
          <q-btn
            unelevated
            no-caps
            label="Sim, desistir"
            class="danger-button"
            :loading="givingUp"
            @click="giveUpJourney"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { clearGameSession, gameSession, saveGameSession } from '@/services/gameSession'
import { clearSession, session, updateSessionUser } from '@/services/session'

const $q = useQuasar()
const router = useRouter()
const profileLoading = ref(false)
const pageError = ref('')
const healing = ref(false)
const difficultyBusy = ref(null)
const givingUp = ref(false)
const giveUpDialog = ref(false)

const difficultyOptions = [
  {
    value: 1,
    label: 'Fácil',
    description: 'Um começo mais tranquilo para conhecer os perigos da jornada.',
    levelText: 'Inimigos até dois níveis abaixo',
    icon: 'landscape',
  },
  {
    value: 2,
    label: 'Médio',
    description: 'Um desafio equilibrado para quem já está preparado.',
    levelText: 'Inimigos no seu nível',
    icon: 'shield',
  },
  {
    value: 3,
    label: 'Difícil',
    description: 'Um caminho perigoso, reservado para quem aceita o risco.',
    levelText: 'Inimigos dois níveis acima',
    icon: 'local_fire_department',
  },
]

const hasActiveGame = computed(() => Boolean(gameSession.choiceID && gameSession.events.length > 0))
const healthRatio = computed(() => {
  const total = Number(session.user?.vida_total) || 0
  const health = Number(session.user?.vida) || 0
  return total > 0 ? Math.min(health / total, 1) : 0
})
const xpRatio = computed(() => Math.min((Number(session.user?.xp) || 0) / 1000, 1))

function className(value) {
  return (
    {
      guerreiro: 'Guerreiro',
      mago: 'Mago',
      bandido: 'Bandido',
    }[value] || 'Aventureiro'
  )
}

function notifyError(error) {
  if (error.status === 401) return

  $q.notify({
    type: 'negative',
    message: error.message || 'Não foi possível concluir a ação.',
    position: 'top',
  })
}

function updateStats(data) {
  if (!session.user) return

  const updatedUser = { ...session.user }
  const fields = {
    vida: 'userHealth',
    vida_total: 'userTotalHealth',
    xp: 'userXP',
    nivel: 'userLevel',
    ataque: 'userAttack',
    defesa: 'userDefense',
  }
  for (const [userField, responseField] of Object.entries(fields)) {
    if (data[responseField] !== undefined) {
      updatedUser[userField] = data[responseField]
    }
  }
  updateSessionUser(updatedUser)
}

async function loadProfile() {
  if (!session.token) return

  profileLoading.value = true
  pageError.value = ''
  try {
    const response = await api.getProfile()
    updateSessionUser(response.data)
  } catch (error) {
    if (error.status === 401) {
      clearSession()
      await router.replace('/login')
      return
    }
    pageError.value = error.message
  } finally {
    profileLoading.value = false
  }
}

async function convertXPToHealth() {
  healing.value = true
  try {
    const response = await api.convertXPToHealth()
    updateStats(response.data)
    $q.notify({
      type: 'positive',
      message: `Vida restaurada. ${response.data.xpSpent} XP utilizado(s).`,
      position: 'top',
    })
  } catch (error) {
    notifyError(error)
  } finally {
    healing.value = false
  }
}

async function giveUpJourney() {
  if (!gameSession.choiceID) return

  givingUp.value = true
  try {
    const response = await api.giveUpChoice(gameSession.choiceID)
    updateStats(response.data)
    clearGameSession()
    giveUpDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'A jornada foi encerrada.',
      position: 'top',
    })
  } catch (error) {
    if (error.status === 401) {
      clearSession()
      await router.replace('/login')
      return
    }
    if ([404, 409].includes(error.status)) {
      clearGameSession()
      giveUpDialog.value = false
      $q.notify({
        type: 'info',
        message: 'Esta jornada já foi encerrada.',
        position: 'top',
      })
      return
    }
    notifyError(error)
  } finally {
    givingUp.value = false
  }
}

async function startGame(difficulty) {
  difficultyBusy.value = difficulty
  try {
    const eventResponse = await api.generateEvents(difficulty)
    const events = eventResponse.data?.eventsOrder
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('Nenhum encontro foi encontrado para esta dificuldade.')
    }

    const choiceResponse = await api.registerChoice(difficulty)
    const choice = choiceResponse.data?.[0]
    if (!choice?.id) {
      throw new Error('A API não retornou o identificador da escolha.')
    }

    saveGameSession({
      difficulty,
      choiceID: choice.id,
      events,
      eventIndex: 0,
      currentEventType: '',
      currentEvent: null,
    })
    await router.push(gameRoutes[difficulty])
  } catch (error) {
    notifyError(error)
  } finally {
    difficultyBusy.value = null
  }
}

const gameRoutes = {
  1: '/game/facil',
  2: '/game/medio',
  3: '/game/dificil',
}

function continueGame() {
  router.push(gameRoutes[gameSession.difficulty])
}

onMounted(loadProfile)
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 76px);
  padding: clamp(32px, 6vw, 70px) 0;
}

.guest-page,
.dashboard {
  width: min(100% - 40px, 1200px);
  margin: 0 auto;
}

.guest-page {
  display: grid;
  min-height: 65vh;
  align-content: center;
  justify-items: start;
}

.eyebrow,
.card-eyebrow {
  color: #c69b66;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.guest-page h1,
.dashboard-heading h1 {
  margin: 16px 0 10px;
  color: #f4ede2;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(38px, 5vw, 60px);
  font-weight: 500;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.guest-page h1 span {
  color: #d8a667;
  font-style: italic;
}

.guest-page p,
.dashboard-heading p {
  max-width: 560px;
  margin: 0;
  color: #aaa597;
  font-size: 15px;
  line-height: 1.7;
}

.guest-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 25px;
}

.primary-button,
.difficulty-button {
  min-height: 44px;
  color: #211a12;
  border-radius: 10px;
  background: linear-gradient(135deg, #edc27f, #d99a54);
  font-weight: 800;
}

.secondary-button {
  color: #e4d8c6;
}

.dashboard {
  display: grid;
  gap: 26px;
}

.dashboard-heading h1 {
  margin: 10px 0 6px;
  font-size: clamp(34px, 4vw, 48px);
}

.four-part-layout {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 16px;
}

.info-card,
.difficulty-card {
  display: flex;
  min-height: 365px;
  flex-direction: column;
  padding: clamp(18px, 2vw, 25px);
  border: 1px solid rgba(224, 193, 149, 0.14);
  border-radius: 18px;
  background: linear-gradient(150deg, rgba(32, 35, 29, 0.96), rgba(24, 25, 21, 0.98));
}

.class-name {
  margin-top: 9px;
  color: #f1e8db;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 25px;
}

.level-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  color: #d6aa6d;
  font-size: 12px;
}

.stat-group {
  display: grid;
  gap: 9px;
  margin-top: 25px;
}

.stat-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #aaa597;
  font-size: 11px;
}

.stat-heading span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-heading .q-icon {
  color: #d79675;
}

.stat-heading strong {
  color: #f0e5d4;
  font-size: 12px;
}

.stat-heading small {
  color: #8d897f;
  font-size: 10px;
  font-weight: 500;
}

.combat-stats {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 25px 0 20px;
}

.combat-stats > div {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 6px;
  color: #9c988c;
  font-size: 11px;
}

.combat-stats .q-icon {
  color: #d8a361;
}

.combat-stats strong {
  color: #f0e5d4;
  font-size: 13px;
}

.heal-button {
  min-height: 40px;
  margin-top: auto;
  color: #f0c77f;
  border: 1px solid rgba(240, 199, 127, 0.25);
  border-radius: 9px;
  background: rgba(205, 151, 77, 0.1);
  font-size: 11px;
}

.difficulty-card {
  transition:
    transform 160ms ease,
    border-color 160ms ease;
}

.difficulty-card:hover {
  transform: translateY(-3px);
  border-color: rgba(224, 193, 149, 0.3);
}

.difficulty-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  margin-bottom: 24px;
  color: #a8c18a;
  border-radius: 12px;
  background: rgba(139, 168, 103, 0.12);
  font-size: 22px;
}

.difficulty-2 .difficulty-icon {
  color: #e1b36c;
  background: rgba(221, 169, 92, 0.12);
}

.difficulty-3 .difficulty-icon {
  color: #d98f79;
  background: rgba(198, 104, 78, 0.13);
}

.difficulty-card h2 {
  margin: 8px 0 7px;
  color: #f0e6d9;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 500;
}

.difficulty-card p {
  margin: 0;
  color: #969185;
  font-size: 12px;
  line-height: 1.65;
}

.difficulty-level {
  margin: auto 0 14px;
  padding-top: 20px;
  color: #c2aa86;
  font-size: 10px;
  font-weight: 700;
}

.difficulty-button {
  min-height: 40px;
  font-size: 11px;
}

.error-banner,
.continue-banner {
  color: #e4cbb8;
  border: 1px solid rgba(207, 129, 101, 0.22);
  background: rgba(151, 67, 45, 0.12);
}

.continue-banner {
  color: #e8d5b6;
  border-color: rgba(224, 193, 149, 0.2);
  background: rgba(224, 193, 149, 0.06);
}

.abandon-journey-button {
  color: #d58e79;
}

.confirmation-card {
  width: min(100%, 440px);
  padding: 8px;
  border: 1px solid rgba(224, 193, 149, 0.14);
  border-radius: 18px;
  background: linear-gradient(150deg, rgba(32, 35, 29, 0.98), rgba(24, 25, 21, 0.99));
  color: #eee5d8;
}

.dialog-title {
  margin-top: 12px;
  color: #f4eadc;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 23px;
}

.confirmation-card p {
  margin: 11px 0 0;
  color: #a7a092;
  font-size: 13px;
  line-height: 1.65;
}

.danger-button {
  color: #f4e4dc;
  border-radius: 9px;
  background: rgba(159, 73, 52, 0.45);
}

.loading-state {
  display: grid;
  min-height: 50vh;
  place-content: center;
  justify-items: center;
  gap: 14px;
  color: #b0aa9c;
}

@media (max-width: 1000px) {
  .four-part-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .guest-page,
  .dashboard {
    width: calc(100% - 28px);
  }

  .four-part-layout {
    grid-template-columns: 1fr;
  }

  .info-card,
  .difficulty-card {
    min-height: 0;
  }

  .difficulty-level {
    margin-top: 22px;
  }
}
</style>

<template>
  <q-page
    class="dificulty-page"
    :style="{
      backgroundImage: `url('${backgroundImage}')`,
    }"
  >
    <q-banner v-if="hasActiveJourney" class="active-journey" rounded>
      <div class="row items-center justify-between q-gutter-md">
        <span>Você tem uma jornada em andamento.</span>
        <div class="row q-gutter-sm">
          <q-btn label="CONTINUAR" color="green-8" unelevated no-caps @click="continueGame" />
          <q-btn
            label="DESISTIR"
            color="red-9"
            flat
            no-caps
            :loading="givingUp"
            @click="giveUpDialog = true"
          />
        </div>
      </div>
    </q-banner>

    <div class="difficulty-container">
      <DifficultyCard
        title="FACIL"
        :challenges="3"
        variant="easy"
        :icon="caveiraFacil"
        :loading="difficultyBusy === 1"
        :disable="difficultyBusy !== null || hasActiveJourney"
        @challenge="handleChallenge"
      />

      <DifficultyCard
        title="NORMAL"
        :challenges="6"
        variant="normal"
        :icon="caveiraNormal"
        :loading="difficultyBusy === 2"
        :disable="difficultyBusy !== null || hasActiveJourney"
        @challenge="handleChallenge"
      />

      <DifficultyCard
        title="DIFICIL"
        :challenges="9"
        variant="hard"
        :icon="caveiraDificil"
        :loading="difficultyBusy === 3"
        :disable="difficultyBusy !== null || hasActiveJourney"
        @challenge="handleChallenge"
      />
    </div>

    <q-dialog v-model="giveUpDialog">
      <q-card class="give-up-card">
        <q-card-section class="text-h6">Encerrar jornada?</q-card-section>
        <q-card-section>Os desafios restantes serão abandonados.</q-card-section>
        <q-card-actions align="right">
          <q-btn label="CANCELAR" flat no-caps v-close-popup />
          <q-btn
            label="DESISTIR"
            color="red-9"
            unelevated
            no-caps
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
import { QPage, useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

import backgroundImage from '../assets/backgrounds/Dificuldade/BackgroundDificuldade.png'

import caveiraFacil from '../assets/icons/dificuldade/caveira_facil.png'
import caveiraNormal from '../assets/icons/dificuldade/caveira_normal.png'
import caveiraDificil from '../assets/icons/dificuldade/caveira_dificil.png'

import DifficultyCard from '../components/difficultyCard.vue'
import { api } from '../services/api'
import { clearGameSession, gameSession, saveGameSession } from '../services/gameSession'
import { session, updateSessionUser } from '../services/session'

const $q = useQuasar()
const router = useRouter()
const difficultyBusy = ref(null)
const givingUp = ref(false)
const giveUpDialog = ref(false)
const hasActiveJourney = computed(() => Boolean(gameSession.choiceID && gameSession.events.length))

const difficultyByTitle = {
  FACIL: 1,
  NORMAL: 2,
  DIFICIL: 3,
}

const gameRoutes = {
  1: '/game/easy',
  2: '/game/normal',
  3: '/game/hard',
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

  const nextUser = { ...session.user }
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
      nextUser[userField] = data[responseField]
    }
  }
  updateSessionUser(nextUser)
}

async function loadProfile() {
  if (!session.token) {
    await router.replace('/')
    return
  }

  try {
    const response = await api.getProfile()
    if (!response?.data || typeof response.data !== 'object') {
      throw new Error('A API não retornou os dados do perfil.')
    }
    updateSessionUser(response.data)
  } catch (error) {
    notifyError(error)
  }
}

async function startGame(difficulty) {
  if (!session.token) {
    await router.replace('/')
    return
  }

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

function handleChallenge(title) {
  const difficulty = difficultyByTitle[title]
  if (difficulty) startGame(difficulty)
}

function continueGame() {
  router.push(gameRoutes[gameSession.difficulty] || '/dificuldade')
}

async function giveUpJourney() {
  if (!gameSession.choiceID) return

  givingUp.value = true
  try {
    const response = await api.giveUpChoice(gameSession.choiceID)
    if (!response?.data) {
      throw new Error('A API não confirmou o encerramento da jornada.')
    }
    updateStats(response.data)
    clearGameSession()
    giveUpDialog.value = false
    $q.notify({ type: 'positive', message: 'A jornada foi encerrada.', position: 'top' })
  } catch (error) {
    if ([404, 409].includes(error.status)) {
      clearGameSession()
      giveUpDialog.value = false
      $q.notify({
        type: 'info',
        message: 'Esta jornada já foi encerrada.',
        position: 'top',
      })
    } else {
      notifyError(error)
    }
  } finally {
    givingUp.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.dificulty-page {
  min-height: calc(100vh - 60px);
  width: 100%;
  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.difficulty-container {
  width: 100%;
  max-width: 930px;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.active-journey {
  position: absolute;
  top: 20px;
  left: 50%;
  z-index: 1;
  width: min(90%, 700px);
  transform: translateX(-50%);
  background-color: #fff4cf;
  color: #594632;
}

.give-up-card {
  min-width: min(90vw, 360px);
  background-color: #fff4cf;
  color: #594632;
}

@media (max-width: 950px) {
  .difficulty-container {
    gap: 20px;
    padding: 20px;
  }
}

@media (max-width: 700px) {
  .dificulty-page {
    padding: 25px 0;
  }

  .difficulty-container {
    flex-direction: column;
    gap: 25px;
  }
}
</style>

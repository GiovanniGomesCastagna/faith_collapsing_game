<template>
  <q-layout view="hHh lpR fFf" class="game-layout">
    <q-header class="game-header" :style="bgStyle(bgTopo)">
      <div class="xp-icon">
        <img src="../assets/icons/gamelayout/xpIcon.png" alt="Experiência" />
      </div>

      <div class="xp-container">
        <q-linear-progress
          :value="xpProgress"
          color="green-6"
          track-color="grey-4"
          rounded
          size="24px"
          class="xp-progress"
        />
        <span class="xp-text">{{ xpAtual }} XP</span>
      </div>
    </q-header>

    <q-drawer show-if-above side="left" :width="240" :breakpoint="0" :style="bgStyle(bgEsquerda)">
      <div class="panel-inner">
        <div class="player-info">
          <div class="player-identity q-mb-md">
            <img :src="classIcon" alt="Classe" class="class-icon" />
            <span class="player-name">{{ player.name }}</span>
          </div>

          <div class="status-row q-mb-sm">
            <img src="../assets/icons/gamelayout/vidaIcon.png" alt="Vida" class="status-icon" />
            <div class="status-value health-progress-container">
              <q-linear-progress
                :value="healthProgress"
                color="red-8"
                track-color="grey-9"
                rounded
                size="40px"
                class="health-progress"
              />
              <span class="health-progress-text">{{ player.hp }}/{{ player.maxHp }}</span>
            </div>
          </div>

          <div class="status-row q-mb-sm">
            <img src="../assets/icons/gamelayout/defesaIcon.png" alt="Defesa" class="status-icon" />
            <div class="status-value defense">{{ player.defense }}</div>
          </div>

          <div class="status-row q-mb-sm">
            <q-icon name="flash_on" class="status-icon attack-icon" aria-label="Ataque" />
            <div class="status-value attack">{{ player.attack }}</div>
          </div>

          <div class="status-row">
            <img src="../assets/icons/gamelayout/lvlIcon.png" alt="Nível" class="status-icon" />
            <span class="player-level">LVL {{ player.level }}</span>
          </div>

          <q-btn
            label="CURAR COM XP"
            icon="favorite"
            class="heal-button"
            unelevated
            no-caps
            :loading="healing"
            :disable="healing || !canHeal"
            @click="convertXPToHealth"
          />

          <q-btn
            label="SAIR"
            icon="logout"
            class="logout-button"
            flat
            no-caps
            :loading="loggingOut"
            :disable="healing"
            @click="handleLogout"
          />
        </div>

        <img src="../assets/Logo.png" alt="Faith Collapsing" class="game-logo" />
      </div>
    </q-drawer>

    <q-drawer show-if-above side="right" :width="56" :breakpoint="0" :style="bgStyle(bgDireita)">
      <div class="social-inner">
        <a
          href="https://www.instagram.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="social-link"
        >
          <img src="../assets/icons/gamelayout/instagramIcon.png" alt="Instagram" />
        </a>
        <a href="https://github.com/" target="_blank" rel="noopener noreferrer" class="social-link">
          <img src="../assets/icons/gamelayout/githubIcon.png" alt="GitHub" />
        </a>
      </div>
    </q-drawer>

    <q-page-container class="game-content">
      <router-view />
    </q-page-container>

    <q-dialog v-model="logoutDialog">
      <q-card class="logout-card">
        <q-card-section class="text-h6">Desistir da jornada e sair?</q-card-section>
        <q-card-section>
          Sua jornada atual será encerrada antes de você sair.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn label="CONTINUAR JOGANDO" flat no-caps v-close-popup />
          <q-btn
            label="DESISTIR E SAIR"
            color="red-9"
            unelevated
            no-caps
            :loading="loggingOut"
            @click="confirmLogout"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import {
  clearGameSession,
  gameSession,
} from '../services/gameSession'
import { clearSession, session, updateSessionUser } from '../services/session'
import banditIcon from '../assets/icons/bandido.png'
import warriorIcon from '../assets/icons/guerreiro.png'
import mageIcon from '../assets/icons/mago.png'
import bgTopo from '../assets/backgrounds/GameLayout/BackTopo.png'
import bgEsquerda from '../assets/backgrounds/GameLayout/BackEsquerda.png'
import bgDireita from '../assets/backgrounds/GameLayout/BackDireita.png'

const $q = useQuasar()
const router = useRouter()
const healing = ref(false)
const loggingOut = ref(false)
const logoutDialog = ref(false)

const bgStyle = (img) => ({
  backgroundColor: '#1d1d1d',
  backgroundImage: `url(${img})`,
  backgroundSize: '100% 100%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  boxShadow: 'none',
})

const player = computed(() => ({
  name: session.user?.nome || 'AVENTUREIRO',
  hp: session.user?.vida ?? 0,
  maxHp: session.user?.vida_total ?? 0,
  defense: session.user?.defesa ?? 0,
  attack: session.user?.ataque ?? 0,
  level: session.user?.nivel ?? 0,
}))

const classIcons = {
  bandido: banditIcon,
  guerreiro: warriorIcon,
  mago: mageIcon,
}
const classIcon = computed(() => classIcons[session.user?.classe] || warriorIcon)
const xpAtual = computed(() => Number(session.user?.xp) || 0)
const xpNecessario = 1000
const xpProgress = computed(() => Math.min(xpAtual.value / xpNecessario, 1))
const healthProgress = computed(() => {
  const health = Number(player.value.hp)
  const maxHealth = Number(player.value.maxHp)
  return maxHealth > 0 ? Math.max(0, Math.min(health / maxHealth, 1)) : 0
})
const canHeal = computed(() => {
  const health = Number(session.user?.vida)
  const maxHealth = Number(session.user?.vida_total)
  return (
    Number.isFinite(health) &&
    Number.isFinite(maxHealth) &&
    health < maxHealth &&
    xpAtual.value > 0
  )
})

async function convertXPToHealth() {
  healing.value = true
  try {
    const response = await api.convertXPToHealth()
    const data = response?.data
    const updatedFields = [
      'userHealth',
      'userTotalHealth',
      'userXP',
      'userLevel',
      'userAttack',
      'userDefense',
      'xpSpent',
    ]
    if (!data || updatedFields.some((field) => data[field] === undefined)) {
      throw new Error('A API não retornou os dados da cura.')
    }

    updateSessionUser({
      ...session.user,
      vida: data.userHealth,
      vida_total: data.userTotalHealth,
      xp: data.userXP,
      nivel: data.userLevel,
      ataque: data.userAttack,
      defesa: data.userDefense,
    })
    $q.notify({
      type: 'positive',
      message: `Vida restaurada. ${data.xpSpent} XP utilizado(s).`,
      position: 'top',
    })
  } catch (error) {
    if (error.status !== 401) {
      $q.notify({
        type: 'negative',
        message: error.message || 'Não foi possível converter XP em vida.',
        position: 'top',
      })
    }
  } finally {
    healing.value = false
  }
}

async function handleLogout() {
  if (gameSession.choiceID) {
    logoutDialog.value = true
    return
  }
  await finishLogout()
}

async function confirmLogout() {
  if (loggingOut.value) return

  loggingOut.value = true
  try {
    if (gameSession.choiceID) {
      await api.giveUpChoice(gameSession.choiceID)
    }
    await finishLogout()
  } catch (error) {
    if ([401, 404, 409].includes(error.status)) {
      await finishLogout()
      return
    }
    $q.notify({
      type: 'negative',
      message: error.message || 'Não foi possível encerrar a jornada.',
      position: 'top',
    })
  } finally {
    loggingOut.value = false
  }
}

async function finishLogout() {
  logoutDialog.value = false
  clearGameSession()
  clearSession()
  await router.replace('/')
}
</script>

<style scoped>
.game-layout {
  background-color: #202020;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
}

.game-header {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 5px 25px;
  box-sizing: border-box;
}

.xp-icon {
  width: 35px;
  height: 35px;
  flex-shrink: 0;
}

.xp-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.xp-container {
  position: relative;
  flex: 1;
  height: 24px;
}

.xp-progress {
  width: 100%;
  height: 100%;
  border: 2px solid #292929;
  border-radius: 20px;
  overflow: hidden;
}

.xp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: 'The Inquisition', serif;
  font-size: 16px;
  font-weight: bold;
  pointer-events: none;
  text-shadow: 1px 1px 2px black;
}

.panel-inner {
  height: 100%;
  box-sizing: border-box;
  padding: 30px 28px 20px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.class-icon,
.status-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  object-fit: contain;
}

.player-name {
  color: white;
  font-family: 'The Inquisition', serif;
  font-size: 20px;
  font-weight: bold;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-value {
  flex: 1;
  min-width: 0;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid #292929;
  border-radius: 11px;
  color: white;
  font-family: 'The Inquisition', serif;
  font-size: 19px;
  font-weight: bold;
}

.health-progress-container {
  position: relative;
  overflow: hidden;
  background-color: #3b2525;
}

.health-progress {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.health-progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-family: 'The Inquisition', serif;
  font-size: 19px;
  font-weight: bold;
  pointer-events: none;
  text-shadow: 1px 1px 2px black;
}

.defense {
  background-color: #818991;
}

.attack {
  background-color: #9c6038;
}

.attack-icon {
  color: #ffd166;
  font-size: 30px;
}

.player-level {
  flex: 1;
  text-align: center;
  color: white;
  font-family: 'The Inquisition', serif;
  font-size: 20px;
  font-weight: bold;
}

.heal-button {
  margin-top: 14px;
  min-height: 38px;
  background-color: #747b4d;
  border: 2px solid #4e5034;
  border-radius: 9px;
  color: white;
  font-size: 13px;
  font-weight: bold;
}

.heal-button:hover {
  background-color: #858c59;
}

.logout-button {
  margin-top: 6px;
  min-height: 34px;
  color: #fff4cf;
  font-size: 13px;
}

.logout-card {
  min-width: min(90vw, 360px);
  background-color: #fff4cf;
  color: #594632;
}

.game-logo {
  width: 100%;
  max-width: 170px;
  align-self: center;
  object-fit: contain;
}

.social-inner {
  height: 100%;
  box-sizing: border-box;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.social-link {
  width: 30px;
  height: 30px;
  transition: transform 0.2s;
}

.social-link img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.social-link:hover {
  transform: scale(1.15);
}

.game-content {
  background-color: #202020;
}
</style>

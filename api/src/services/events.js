const db = require("../configs");
const enemiesService = require("./enemies");
const choicesService = require("./choices");
const rewardsService = require("./rewards");
const usersService = require("./users");

// busca o evento no banco através da ID
async function getEventByID(id, queryExecutor = db, lockForUpdate = false) {
  const sql = `
  SELECT * FROM EVENTOS WHERE id = $1 ${lockForUpdate ? "FOR UPDATE" : ""};
  `;

  const result = await queryExecutor.query(sql, [id]);
  return result.rows[0];
}

// faz o sorteio dos eventos com base na dificuldade selecionada
async function sortEventsByDifficulty(difficulty) {
  const eventsOrder = [];

  function pickRandomIndex(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function eventSorter(difficulty) {
    const k = 1 + (difficulty - 1) * 2;
    return Math.floor(Math.pow(Math.random(), 1 / k) * 2);
  }

  for (let i = 0; i < difficulty * 3; i++) {
    const sortedEvents = eventSorter(difficulty);

    if (sortedEvents == 1) {
      const enemies = await enemiesService.getEnemiesByDifficulty(difficulty);
      eventsOrder.push({ type: "enemy", data: pickRandomIndex(enemies) });
    } else {
      const rewards = await rewardsService.getRewardsByDifficulty(difficulty);
      eventsOrder.push({ type: "reward", data: pickRandomIndex(rewards) });
    }
  }
  return eventsOrder;
}

async function registerEvent(params) {
  const { choiceID, userID, relatedID, eventType } = params;
  const sourceByType = {
    enemy: {
      foreignKey: "id_inimigo",
      getByID: enemiesService.getEnemyByID,
    },
    reward: {
      foreignKey: "id_recompensa",
      getByID: rewardsService.getRewardByID,
    },
  };
  const source = Object.hasOwn(sourceByType, eventType)
    ? sourceByType[eventType]
    : null;

  if (!source) {
    throw createEventError("Event type does not exist.", 400);
  }

  for (const id of [choiceID, userID, relatedID]) {
    if (
      (typeof id !== "string" && typeof id !== "number") ||
      (typeof id === "string" && id.trim() === "") ||
      (typeof id === "number" && !Number.isSafeInteger(id))
    ) {
      throw createEventError("Event registration IDs are invalid.", 400);
    }
  }

  const client = await db.getClient();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const userData = await usersService.getUserByID(userID, client, true);
    if (!userData) {
      throw createEventError("User not found.", 404);
    }

    const choice = await choicesService.getChoiceByID(choiceID, client, true);
    if (!choice) {
      throw createEventError("Choice not found.", 404);
    }

    if (String(choice.id_usuario) !== String(userID)) {
      throw createEventError("This choice does not belong to this user.", 403);
    }
    ensureActiveChoice(choice);

    const sourceData = await source.getByID(relatedID, client);
    if (!sourceData) {
      throw createEventError("Enemy or reward not found.", 404);
    }

    if (String(sourceData.dificuldade) !== String(choice.dificuldade)) {
      throw createEventError(
        "Enemy or reward difficulty does not match the choice.",
        409,
      );
    }

    const eventStats =
      eventType === "enemy"
        ? enemiesService.getEnemyStatsForPlayerLevel(
            sourceData,
            userData.nivel,
          )
        : sourceData;

    const sql = `
      INSERT INTO EVENTOS
        (id_escolhas, nome, ${source.foreignKey}, status, vida, defesa, ataque, xp)
      VALUES
        ($1, $2, $3, 'Andamento', $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await client.query(sql, [
      choice.id,
      sourceData.nome,
      sourceData.id,
      eventStats.vida,
      eventStats.defesa ?? (eventType === "reward" ? 0 : undefined),
      eventStats.ataque ?? (eventType === "reward" ? 0 : undefined),
      sourceData.xp,
    ]);

    await client.query("COMMIT");
    transactionStarted = false;
    return result.rows;
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function updateEvent(params, queryExecutor = db) {
  const allowedFields = ["status", "vida", "xp", "defesa", "ataque"];
  const fields = [];
  const binds = [];
  let bindIndex = 1;

  for (const field of allowedFields) {
    if (Object.hasOwn(params, field)) {
      fields.push(`${field} = $${bindIndex++}`);
      binds.push(params[field]);
    }
  }

  if (fields.length === 0) {
    throw new Error("No fields provided for update");
  }

  binds.push(params.id);
  const sql = `
    update eventos
       set ${fields.join(",")}
     where id = $${bindIndex}
     returning *
  `;

  const result = await queryExecutor.query(sql, binds);
  return result.rows;
}

function createEventError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function ensureActiveEvent(eventData) {
  if (eventData.status !== "Andamento") {
    throw createEventError("This event is no longer active.", 409);
  }
}

function ensureActiveChoice(choiceData) {
  if (choiceData.status != null && choiceData.status !== "Andamento") {
    throw createEventError("This choice is already finished.", 409);
  }
}

async function withUserEventTransaction(params, operation) {
  const { userID, eventID } = params;
  const client = await db.getClient();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const userData = await usersService.getUserByID(userID, client, true);
    if (!userData) {
      throw createEventError("User not found.", 404);
    }

    const eventData = await getEventByID(eventID, client, true);
    if (!eventData) {
      throw createEventError("Event not found.", 404);
    }

    const choiceData = await choicesService.getChoiceByID(
      eventData.id_escolhas,
      client,
      true,
    );
    if (!choiceData) {
      throw createEventError("Choice not found.", 404);
    }

    if (String(choiceData.id_usuario) !== String(userID)) {
      throw createEventError("This choice does not belong to this user.", 403);
    }
    ensureActiveChoice(choiceData);

    const result = await operation({
      client,
      userData,
      eventData,
      choiceData,
    });
    await client.query("COMMIT");
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function attack(params) {
  return withUserEventTransaction(
    params,
    async ({ client, userData, eventData }) => {
      if (eventData.id_inimigo === undefined || eventData.id_inimigo === null) {
        throw createEventError("Only enemy events can be attacked.", 409);
      }

      ensureActiveEvent(eventData);

      const gameData = {
        eventID: eventData.id,
        userID: userData.id,
        userHealth: userData.vida,
        userTotalHealth: userData.vida_total,
        userXP: userData.xp,
        userLevel: userData.nivel,
        userAttack: userData.ataque,
        userDefense: userData.defesa,
        enemyID: eventData.id_inimigo,
        enemyHealth: eventData.vida,
        enemyAttack: eventData.ataque,
        enemyDefense: eventData.defesa,
        gameStatus: eventData.status,
        xpGained: 0,
      };

      function runD20() {
        return Math.floor(Math.random() * 20) + 1;
      }

      const userRoll = runD20();
      const enemyRoll = runD20();
      const userHit = userRoll > gameData.enemyDefense;
      let enemyHit = false;
      let enemyAttackResolved = false;

      if (userHit) {
        gameData.enemyHealth -= gameData.userAttack;
      }

      if (gameData.enemyHealth <= 0) {
        gameData.gameStatus = "Vencido";
        gameData.enemyHealth = 0;
      } else {
        enemyAttackResolved = true;
        enemyHit = enemyRoll > gameData.userDefense;
        if (enemyHit) {
          gameData.userHealth -= gameData.enemyAttack;
        }

        if (gameData.userHealth <= 0) {
          gameData.gameStatus = "Perdido";
          gameData.userHealth = 0;
        } else {
          gameData.gameStatus = "Andamento";
        }
      }

      if (gameData.gameStatus === "Vencido") {
        const enemyXP = Number(eventData.xp);
        const currentXP = Number(userData.xp);
        const updatedXP = currentXP + enemyXP;
        if (
          eventData.xp === null ||
          eventData.xp === undefined ||
          !Number.isSafeInteger(enemyXP) ||
          enemyXP < 0 ||
          !Number.isSafeInteger(currentXP) ||
          currentXP < 0 ||
          !Number.isSafeInteger(updatedXP)
        ) {
          throw createEventError("Enemy XP values are invalid.", 500);
        }

        const updatedUsers = await usersService.updateUser(
          {
            id: userData.id,
            vida: gameData.userHealth,
            xp: updatedXP,
          },
          client,
        );
        if (!updatedUsers.length) {
          throw createEventError("User not found.", 404);
        }
        const updatedUser = updatedUsers[0];
        Object.assign(gameData, {
          userHealth: updatedUser.vida,
          userTotalHealth: updatedUser.vida_total,
          userXP: updatedUser.xp,
          userLevel: updatedUser.nivel,
          userAttack: updatedUser.ataque,
          userDefense: updatedUser.defesa,
          xpGained: enemyXP,
        });
      } else {
        await usersService.updateUser(
          {
            id: userData.id,
            vida: gameData.userHealth,
          },
          client,
        );
      }

      await updateEvent(
        {
          id: eventData.id,
          status: gameData.gameStatus,
          vida: gameData.enemyHealth,
        },
        client,
      );

      return {
        ...gameData,
        userRoll,
        enemyRoll,
        userHit,
        enemyHit,
        enemyAttackResolved,
      };
    },
  );
}

async function claimReward(params) {
  return withUserEventTransaction(
    params,
    async ({ client, userData, eventData }) => {
      const hasReward =
        eventData.id_recompensa !== undefined &&
        eventData.id_recompensa !== null;
      const hasEnemy =
        eventData.id_inimigo !== undefined && eventData.id_inimigo !== null;

      if (!hasReward || hasEnemy) {
        throw createEventError("Only reward events can be claimed.", 409);
      }

      ensureActiveEvent(eventData);

      const rewardHealth = Number(eventData.vida);
      const rewardXP = Number(eventData.xp);
      const currentUserHealth = Number(userData.vida);
      const userTotalHealth = Number(userData.vida_total);
      const userHealth = currentUserHealth + rewardHealth;
      const userXP = Number(userData.xp) + rewardXP;

      if (
        !Number.isSafeInteger(rewardHealth) ||
        rewardHealth < 0 ||
        !Number.isSafeInteger(rewardXP) ||
        rewardXP < 0 ||
        !Number.isSafeInteger(currentUserHealth) ||
        currentUserHealth < 0 ||
        !Number.isSafeInteger(userHealth) ||
        !Number.isSafeInteger(userTotalHealth) ||
        userTotalHealth < 0 ||
        currentUserHealth > userTotalHealth ||
        !Number.isSafeInteger(userXP) ||
        userXP < 0
      ) {
        throw createEventError("Reward values are invalid.", 500);
      }

      const updatedUsers = await usersService.updateUser(
        {
          id: userData.id,
          vida: userHealth,
          xp: userXP,
        },
        client,
      );
      await updateEvent(
        {
          id: eventData.id,
          status: "Resgatado",
        },
        client,
      );

      const updatedUser = updatedUsers[0];
      return {
        eventID: eventData.id,
        userID: updatedUser.id,
        userHealth: updatedUser.vida,
        userTotalHealth: updatedUser.vida_total,
        userXP: updatedUser.xp,
        userLevel: updatedUser.nivel,
        userAttack: updatedUser.ataque,
        userDefense: updatedUser.defesa,
        eventStatus: "Resgatado",
      };
    },
  );
}

async function giveUp(params) {
  return withUserEventTransaction(
    params,
    async ({ client, userData, eventData, choiceData }) => {
      if (
        eventData.id_inimigo === undefined ||
        eventData.id_inimigo === null ||
        (eventData.id_recompensa !== undefined &&
          eventData.id_recompensa !== null)
      ) {
        throw createEventError("Only enemy events can be abandoned.", 409);
      }

      ensureActiveEvent(eventData);

      const updatedEvents = await updateEvent(
        {
          id: eventData.id,
          status: "Desistido",
        },
        client,
      );
      const finishedChoice = await choicesService.finishChoice(
        choiceData.id,
        client,
      );

      if (!updatedEvents.length || !finishedChoice) {
        throw createEventError("Event or choice not found.", 404);
      }

      return {
        eventID: eventData.id,
        userID: userData.id,
        userHealth: userData.vida,
        userTotalHealth: userData.vida_total,
        userXP: userData.xp,
        eventStatus: "Desistido",
        choiceID: finishedChoice.id,
        choiceStatus: finishedChoice.status,
      };
    },
  );
}

async function giveUpChoice(params) {
  const { userID, choiceID } = params;
  const client = await db.getClient();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const userData = await usersService.getUserByID(userID, client, true);
    if (!userData) {
      throw createEventError("User not found.", 404);
    }

    const choiceData = await choicesService.getChoiceByID(
      choiceID,
      client,
      true,
    );
    if (!choiceData) {
      throw createEventError("Choice not found.", 404);
    }
    if (String(choiceData.id_usuario) !== String(userID)) {
      throw createEventError("This choice does not belong to this user.", 403);
    }
    ensureActiveChoice(choiceData);

    let updatedUser = userData;
    if (Number(userData.vida) === 0) {
      const recoveredUsers = await usersService.updateUser(
        {
          id: userData.id,
          vida: Number(userData.vida_total),
        },
        client,
      );
      if (!recoveredUsers.length) {
        throw createEventError("User not found.", 404);
      }
      updatedUser = recoveredUsers[0];
    }

    await client.query(
      `
        UPDATE EVENTOS
           SET status = 'Desistido'
         WHERE id_escolhas = $1
           AND status = 'Andamento'
      `,
      [choiceData.id],
    );
    const finishedChoice = await choicesService.finishChoice(
      choiceData.id,
      client,
    );

    if (!finishedChoice) {
      throw createEventError("Choice not found.", 404);
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return {
      userID: updatedUser.id,
      userHealth: updatedUser.vida,
      userTotalHealth: updatedUser.vida_total,
      userXP: updatedUser.xp,
      userLevel: updatedUser.nivel,
      userAttack: updatedUser.ataque,
      userDefense: updatedUser.defesa,
      choiceID: finishedChoice.id,
      choiceStatus: finishedChoice.status,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  sortEventsByDifficulty,
  registerEvent,
  updateEvent,
  attack,
  claimReward,
  giveUp,
  giveUpChoice,
};

const db = require("../configs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const MAX_XP = 1000;
const MAX_LEVEL = 50;
const XP_EXPONENT = 1.3;
const STAT_UPGRADE_INTERVAL = 3;
const MAX_TOTAL_HEALTH = 30;
const MAX_ATTACK = 40;
const MAX_DEFENSE = 40;

const CLASS_STATS = {
  guerreiro: { vida: 12, ataque: 9, defesa: 9 },
  mago: { vida: 6, ataque: 5, defesa: 4 },
  bandido: { vida: 8, ataque: 8, defesa: 6 },
};

function createUserError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getClassStats(className) {
  if (
    typeof className !== "string" ||
    !Object.hasOwn(CLASS_STATS, className)
  ) {
    return undefined;
  }

  const classStats = CLASS_STATS[className];
  return classStats ? { ...classStats } : undefined;
}

function getStatAtLevel(
  baseValue,
  maximumValue,
  level,
  firstUpgradeLevel,
  capLevel,
) {
  const maximumUpgrades =
    Math.floor((capLevel - firstUpgradeLevel) / STAT_UPGRADE_INTERVAL) + 1;
  const earnedUpgrades = Math.min(
    maximumUpgrades,
    Math.max(
      0,
      Math.floor((level - firstUpgradeLevel) / STAT_UPGRADE_INTERVAL) + 1,
    ),
  );

  return (
    baseValue +
    Math.floor(
      ((maximumValue - baseValue) * earnedUpgrades) / maximumUpgrades,
    )
  );
}

function getStatsForLevel(className, level) {
  const baseStats = getClassStats(className);
  if (!baseStats) {
    throw createUserError("User class is invalid.", 500);
  }

  return {
    vida_total: getStatAtLevel(baseStats.vida, MAX_TOTAL_HEALTH, level, 2, 30),
    ataque: getStatAtLevel(baseStats.ataque, MAX_ATTACK, level, 3, 40),
    defesa: getStatAtLevel(baseStats.defesa, MAX_DEFENSE, level, 4, 40),
  };
}

function getXPForLevel(level) {
  const boundedLevel = Math.min(Math.max(level, 1), MAX_LEVEL);
  return Math.round(
    MAX_XP *
      Math.pow((boundedLevel - 1) / (MAX_LEVEL - 1), XP_EXPONENT),
  );
}

function getLevelForXP(xp) {
  const boundedXP = Math.min(Math.max(xp, 0), MAX_XP);
  let level = 1;

  for (let nextLevel = 2; nextLevel <= MAX_LEVEL; nextLevel++) {
    if (boundedXP < getXPForLevel(nextLevel)) {
      break;
    }

    level = nextLevel;
  }

  return level;
}

async function getUserByID(id, queryExecutor = db, lockForUpdate = false) {
  const sql = `
  SELECT *
  FROM USUARIOS
  WHERE ID = $1 ${lockForUpdate ? "FOR UPDATE" : ""}
  `;

  const result = await queryExecutor.query(sql, [id]);
  return result.rows[0];
}

async function updateUser(params, queryExecutor = db) {
  const inputFields = [
    "nome",
    "classe",
    "vida",
    "defesa",
    "ataque",
    "xp",
  ];
  const hasHealth = Object.hasOwn(params, "vida");
  const hasXP = Object.hasOwn(params, "xp");
  const hasClass = Object.hasOwn(params, "classe");
  const hasProgressionChange = hasXP || hasClass;
  const hasAllowedInput = inputFields.some((field) =>
    Object.hasOwn(params, field),
  );

  if (!hasAllowedInput) {
    throw createUserError("No fields provided for update", 400);
  }

  let healthValue;

  if (hasHealth) {
    healthValue = Number(params.vida);
    if (
      (typeof params.vida !== "number" &&
        typeof params.vida !== "string") ||
      (typeof params.vida === "string" && params.vida.trim() === "") ||
      !Number.isSafeInteger(healthValue) ||
      healthValue < 0
    ) {
      throw createUserError("Health must be a non-negative integer", 400);
    }
  }

  let xpValue;

  if (hasXP) {
    xpValue = Number(params.xp);
    if (
      params.xp === null ||
      params.xp === "" ||
      !Number.isSafeInteger(xpValue) ||
      xpValue < 0
    ) {
      throw createUserError("XP must be a non-negative integer", 400);
    }
  }

  let userData;
  if (hasHealth || hasProgressionChange) {
    userData = await getUserByID(params.id, queryExecutor, true);
    if (!userData) {
      return [];
    }
  }

  const updates = {};
  for (const field of inputFields) {
    if (Object.hasOwn(params, field)) {
      updates[field] =
        field === "xp"
          ? xpValue
          : field === "vida"
            ? healthValue
            : params[field];
    }
  }

  if (hasProgressionChange) {
    const level = hasXP ? getLevelForXP(xpValue) : Number(userData.nivel);
    const className = hasClass ? params.classe : userData.classe;
    const stats = getStatsForLevel(className, level);
    const currentHealth = Number(userData.vida);
    const previousTotalHealth = Number(userData.vida_total);

    if (
      !Number.isSafeInteger(level) ||
      !Number.isSafeInteger(currentHealth) ||
      currentHealth < 0 ||
      !Number.isSafeInteger(previousTotalHealth) ||
      previousTotalHealth < 0 ||
      currentHealth > previousTotalHealth
    ) {
      throw createUserError("User progression data is invalid.", 500);
    }

    const healthBeforeLevelGain = hasHealth ? healthValue : currentHealth;
    const updatedTotalHealth = Math.max(
      previousTotalHealth,
      stats.vida_total,
    );
    const totalHealthGain = updatedTotalHealth - previousTotalHealth;
    const updatedHealth = Math.min(
      healthBeforeLevelGain + totalHealthGain,
      updatedTotalHealth,
    );

    if (!Number.isSafeInteger(updatedHealth)) {
      throw createUserError("User health is invalid.", 500);
    }

    Object.assign(updates, stats, {
      vida_total: updatedTotalHealth,
      vida: updatedHealth,
      nivel: level,
    });
  } else if (hasHealth) {
    const totalHealth = Number(userData.vida_total);
    if (!Number.isSafeInteger(totalHealth) || totalHealth < 0) {
      throw createUserError("User total health is invalid.", 500);
    }

    if (healthValue > totalHealth) {
      throw createUserError("Health cannot exceed total health", 400);
    }
  }

  const updateFields = [
    "nome",
    "classe",
    "vida",
    "vida_total",
    "defesa",
    "ataque",
    "xp",
    "nivel",
  ];
  const fields = [];
  const binds = [];
  let bindIndex = 1;

  for (const field of updateFields) {
    if (Object.hasOwn(updates, field)) {
      fields.push(` ${field} = $${bindIndex++} `);
      binds.push(updates[field]);
    }
  }

  binds.push(params.id);
  const sql = `
    update usuarios
       set ${fields.join(",")}
     where id = $${bindIndex}
     returning *
  `;

  const result = await queryExecutor.query(sql, binds);
  return result.rows;
}

async function register(params) {
  const { email, senha, nome, classe, vida, ataque, defesa } = params;
  const sql = `
    insert into usuarios (
      email,
      senha_hash,
      nome,
      classe,
      vida,
      vida_total,
      ataque,
      defesa,
      xp,
      nivel
    ) values (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      0,
      1
    ) returning id, email, nome, vida, vida_total, ataque, defesa, xp, nivel
  `;
  const senhaHash = await bcrypt.hash(senha, 10);
  const result = await db.query(sql, [
    email,
    senhaHash,
    nome,
    classe,
    vida,
    vida,
    ataque,
    defesa,
  ]);
  return result.rows;
}

async function getUserByEmail(params) {
  const { email } = params;
  const sql =
    "select id, email, nome, vida, vida_total, ataque, defesa, xp, nivel, senha_hash from usuarios where email = $1";
  const result = await db.query(sql, [email]);
  return result.rows;
}

async function convertXPToHealth(userID) {
  const client = await db.getClient();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const userData = await getUserByID(userID, client, true);
    if (!userData) {
      throw createUserError("User not found.", 404);
    }

    const currentHealth = Number(userData.vida);
    const totalHealth = Number(userData.vida_total);
    const currentXP = Number(userData.xp);

    if (
      !Number.isSafeInteger(currentHealth) ||
      !Number.isSafeInteger(totalHealth) ||
      !Number.isSafeInteger(currentXP) ||
      currentHealth < 0 ||
      totalHealth < 0 ||
      currentXP < 0 ||
      currentHealth > totalHealth
    ) {
      throw createUserError("User progression data is invalid.", 500);
    }

    const missingHealth = totalHealth - currentHealth;
    if (missingHealth === 0) {
      throw createUserError("Health is already full.", 409);
    }

    const xpSpent = Math.min(missingHealth, currentXP);
    const remainingXP = currentXP - xpSpent;
    const newLevel = getLevelForXP(remainingXP);
    const progressionStats = getStatsForLevel(userData.classe, newLevel);
    const updatedHealth = totalHealth;
    const sql = `
      UPDATE usuarios
         SET vida = $1,
             xp = $2,
             nivel = $3,
             ataque = $4,
             defesa = $5
       WHERE id = $6
       RETURNING id, vida, vida_total, xp, nivel, ataque, defesa
    `;
    const result = await client.query(sql, [
      updatedHealth,
      remainingXP,
      newLevel,
      progressionStats.ataque,
      progressionStats.defesa,
      userID,
    ]);

    await client.query("COMMIT");
    transactionStarted = false;

    const updatedUser = result.rows[0];
    return {
      userID: updatedUser.id,
      userHealth: updatedUser.vida,
      userTotalHealth: updatedUser.vida_total,
      userXP: updatedUser.xp,
      userLevel: updatedUser.nivel,
      userAttack: updatedUser.ataque,
      userDefense: updatedUser.defesa,
      healthRestored: missingHealth,
      xpSpent,
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

function invalidCredentialsError() {
  const error = new Error("Email ou senha inválidos");
  error.statusCode = 401;
  return error;
}

async function login(params) {
  const { email, senha } = params;

  const userExists = await getUserByEmail({ email });
  if (!userExists.length) {
    throw invalidCredentialsError();
  }

  const user = userExists[0];

  const senhaCorreta = await bcrypt.compare(senha, user.senha_hash);
  if (!senhaCorreta) {
    throw invalidCredentialsError();
  }

  delete user.senha_hash;

  const token = jwt.sign({ user }, process.env.AUTH_KEY, {
    algorithm: "HS256",
    expiresIn: "8h",
  });

  return {
    user,
    token,
  };
}

module.exports = {
  getClassStats,
  register,
  updateUser,
  getUserByEmail,
  getUserByID,
  convertXPToHealth,
  login,
};

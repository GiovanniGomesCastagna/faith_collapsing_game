const db = require("../configs");

async function getChoiceByID(id, queryExecutor = db, lockForUpdate = false) {
  const sql = `
    SELECT id, id_usuario, dificuldade, status
    FROM ESCOLHAS
    WHERE id = $1 ${lockForUpdate ? "FOR UPDATE" : ""}
  `;

  const result = await queryExecutor.query(sql, [id]);
  return result.rows[0];
}

async function registerChoice(params) {
  const { userID, difficulty } = params;
  const sql = `
    INSERT INTO ESCOLHAS (id_usuario, dificuldade, status)
    VALUES ($1, $2, 'Andamento')
    RETURNING id, id_usuario, dificuldade, status
  `;

  const result = await db.query(sql, [userID, difficulty]);
  return result.rows;
}

async function finishChoice(id, queryExecutor = db) {
  const sql = `
    UPDATE ESCOLHAS
       SET status = 'Finalizado'
     WHERE id = $1
     RETURNING id, status
  `;

  const result = await queryExecutor.query(sql, [id]);
  return result.rows[0];
}

module.exports = {
  getChoiceByID,
  registerChoice,
  finishChoice,
};

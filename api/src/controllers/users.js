const usersService = require("../services/users");

async function register(req, res) {
  try {
    if (
      !req.body.email ||
      !req.body.senha ||
      !req.body.senha_confirm ||
      !req.body.nome ||
      !req.body.classe
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Campos obrigatórios faltando: email, senha, senha_confirm, nome, classe",
      });
    }

    const { classe } = req.body;
    const classStats = usersService.getClassStats(classe);

    if (!classStats) {
      return res.status(400).json({
        status: "error",
        message: "Classe inválida.",
      });
    }

    const userExists = await usersService.getUserByEmail({
      email: req.body.email,
    });
    if (userExists.length) {
      return res.status(409).json({
        status: "error",
        message: `O email "${req.body.email}" já está em uso`,
      });
    }

    if (req.body.senha !== req.body.senha_confirm) {
      return res.status(400).json({
        status: "error",
        message: "Os campos senha e senha_confirm precisam ser iguais",
      });
    }

    if (req.body.senha.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "A senha deve ter ao menos 8 caracteres",
      });
    }

    const userParams = {
      ...req.body,
      ...classStats,
    };

    const user = await usersService.register(userParams);
    return res.status(201).json({
      status: "ok",
      message: "Usuário registrado com sucesso!",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

async function login(req, res) {
  try {
    if (!req.body.email || !req.body.senha) {
      return res.status(400).json({
        status: "error",
        message: "Campos obrigatórios faltando: email, senha",
      });
    }

    const user = await usersService.login(req.body);
    return res.status(200).json(user);
  } catch (error) {
    const statusCode = error.statusCode === 401 ? 401 : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

async function getUser(req, res) {
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  try {
    const user = await usersService.getUserByID(userID);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
      });
    }

    const { senha_hash, ...safeUser } = user;
    return res.status(200).json({
      status: "ok",
      data: safeUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

async function convertXPToHealth(req, res) {
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  try {
    const conversionData = await usersService.convertXPToHealth(userID);
    return res.status(200).json({
      status: "ok",
      data: conversionData,
    });
  } catch (error) {
    const statusCode = [404, 409].includes(error.statusCode)
      ? error.statusCode
      : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

async function updateUser(req, res) {
  const userID = req.user?.user?.id;
  const userChanges = req.body ?? {};

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  const progressionFields = [
    "classe",
    "vida",
    "vida_total",
    "ataque",
    "defesa",
    "xp",
    "nivel",
  ];
  if (progressionFields.some((field) => Object.hasOwn(userChanges, field))) {
    return res.status(400).json({
      status: "error",
      message: "Progression fields cannot be changed through this endpoint.",
    });
  }

  try {
    const updatedUser = await usersService.updateUser({
      ...userChanges,
      id: userID,
    });

    if (!updatedUser.length) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
      });
    }

    const safeUsers = updatedUser.map(({ senha_hash, ...user }) => user);

    return res.status(200).json({
      status: "ok",
      data: safeUsers,
    });
  } catch (error) {
    const statusCode = error.statusCode === 400 ? 400 : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  getUser,
  convertXPToHealth,
  updateUser,
};

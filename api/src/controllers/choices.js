const choicesService = require("../services/choices");

async function registerChoice(req, res) {
  const { dificuldade: difficulty } = req.body ?? {};
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  if (!difficulty) {
    return res.status(400).json({
      status: "error",
      message: "Missing dificuldade on POST request.",
    });
  }

  try {
    const choice = await choicesService.registerChoice({
      userID,
      difficulty,
    });

    return res.status(201).json({
      status: "Choice Created",
      data: choice,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = {
  registerChoice,
};

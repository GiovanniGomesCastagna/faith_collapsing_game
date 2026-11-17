const eventsService = require("../services/events.js");

async function generateEvents(req, res) {
  try {
    const eventsOrder = await eventsService.sortEventsByDifficulty(
      req.query.difficulty,
    );

    return res.status(200).json({
      message: "Created List",
      data: { eventsOrder },
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

async function registerEvent(req, res) {
  const { eventType, idEvent, id_escolhas: choiceID } = req.body ?? {};
  const userID = req.user?.user?.id;
  const requiredValues = [userID, choiceID, eventType, idEvent];

  if (
    requiredValues.some(
      (value) => value === undefined || value === null || value === "",
    )
  ) {
    return res.status(400).json({
      status: "error",
      message: "Missing fields on POST request.",
    });
  }

  try {
    const eventCreated = await eventsService.registerEvent({
      choiceID,
      userID,
      relatedID: idEvent,
      eventType,
    });

    return res.status(201).json({
      status: "Event Created",
      data: eventCreated,
    });
  } catch (error) {
    const statusCode = [400, 403, 404, 409].includes(error.statusCode)
      ? error.statusCode
      : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

async function attack(req, res) {
  const eventID = req.body?.eventID;
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  if (eventID === undefined || eventID === null || eventID === "") {
    return res.status(400).json({
      status: "error",
      message: "Missing eventID on POST request.",
    });
  }

  try {
    const gameData = await eventsService.attack({ userID, eventID });
    return res.status(200).json({
      status: "ok",
      data: gameData,
    });
  } catch (error) {
    const statusCode = [403, 404, 409].includes(error.statusCode)
      ? error.statusCode
      : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

async function giveUp(req, res) {
  const eventID = req.body?.eventID;
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  if (eventID === undefined || eventID === null || eventID === "") {
    return res.status(400).json({
      status: "error",
      message: "Missing eventID on POST request.",
    });
  }

  try {
    const result = await eventsService.giveUp({ userID, eventID });
    return res.status(200).json({
      status: "ok",
      data: result,
    });
  } catch (error) {
    const statusCode = [403, 404, 409].includes(error.statusCode)
      ? error.statusCode
      : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

async function giveUpChoice(req, res) {
  const choiceID = req.body?.choiceID;
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  if (choiceID === undefined || choiceID === null || choiceID === "") {
    return res.status(400).json({
      status: "error",
      message: "Missing choiceID on POST request.",
    });
  }

  try {
    const result = await eventsService.giveUpChoice({ userID, choiceID });
    return res.status(200).json({
      status: "ok",
      data: result,
    });
  } catch (error) {
    const statusCode = [403, 404, 409].includes(error.statusCode)
      ? error.statusCode
      : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

async function claimReward(req, res) {
  const eventID = req.body?.eventID;
  const userID = req.user?.user?.id;

  if (userID === undefined || userID === null) {
    return res.status(401).json({
      status: "error",
      message: "Authentication is required.",
    });
  }

  if (eventID === undefined || eventID === null || eventID === "") {
    return res.status(400).json({
      status: "error",
      message: "Missing eventID on POST request.",
    });
  }

  try {
    const rewardData = await eventsService.claimReward({ userID, eventID });
    return res.status(200).json({
      status: "ok",
      data: rewardData,
    });
  } catch (error) {
    const statusCode = [403, 404, 409].includes(error.statusCode)
      ? error.statusCode
      : 500;
    return res.status(statusCode).json({
      status: "error",
      message: error.message,
    });
  }
}

module.exports = {
  generateEvents,
  registerEvent,
  attack,
  giveUp,
  giveUpChoice,
  claimReward,
};

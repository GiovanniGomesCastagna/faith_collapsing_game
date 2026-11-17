const eventsController = require("../controllers/events");
const authenticate = require("../middleware/auth");

module.exports = (app) => {
  app.get("/game", eventsController.generateEvents);
  app.post("/events/register", authenticate, eventsController.registerEvent);
  app.post("/events/attack", authenticate, eventsController.attack);
  app.post("/events/give-up", authenticate, eventsController.giveUp);
  app.post(
    "/events/give-up-choice",
    authenticate,
    eventsController.giveUpChoice,
  );
  app.post("/events/rewards/claim", authenticate, eventsController.claimReward);
};

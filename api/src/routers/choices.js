const choicesController = require("../controllers/choices");
const authenticate = require("../middleware/auth");

module.exports = (app) => {
  app.post("/choices/register", authenticate, choicesController.registerChoice);
};

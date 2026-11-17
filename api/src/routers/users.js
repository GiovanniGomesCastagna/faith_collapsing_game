const usersController = require("../controllers/users");
const authenticate = require("../middleware/auth");

module.exports = (app) => {
  app.post("/auth/register", usersController.register);
  app.post("/auth/login", usersController.login);
  app.get("/users/me", authenticate, usersController.getUser);
  app.post(
    "/users/me/convert-xp-to-health",
    authenticate,
    usersController.convertXPToHealth,
  );
  app.patch("/users/me", authenticate, usersController.updateUser);
};

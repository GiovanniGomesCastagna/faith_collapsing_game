const exampleRoute = require('./example');
const eventsRoute = require('./events');
const usersRoute = require('./users');
const choicesRoute = require('./choices');

module.exports = (app) => {
  exampleRoute(app);
  eventsRoute(app);
  usersRoute(app);
  choicesRoute(app);
}
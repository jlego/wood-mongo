/**
 * Wood Plugin Module.
 * mongo操作库
 * by jlego on 2018-11-18
 */
const Mongo = require('./src/mongo');

module.exports = (app = {}, config = {}) => {
  app.Mongo = Mongo;
  if(app.addAppProp) app.addAppProp('Mongo', app.Mongo);
  return app;
}

/**
 * Wood Plugin Module.
 * mongo操作库
 * by jlego on 2018-11-18
 */
const Mongo = require('./src/mongo');

module.exports = async (app = {}, config = {}) => {
  for (let key in config) {
    await Mongo.connect(config[key], key);
  }
  return app;
}

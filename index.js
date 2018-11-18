/**
 * Wood Plugin Module.
 * mongo操作库
 * by jlego on 2018-11-18
 */
const Mongo = require('./src/mongo');
const { catchErr, error } = require('wood-util')();

module.exports = async (app, config = {}) => {
  if(app){
    app.Mongo = Mongo;
    for (let key in config) {
      await Mongo.connect(config[key], key);
    }
  }
  return Mongo;
}

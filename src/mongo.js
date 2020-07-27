// mongodb操作方法类
// by YuRonghui 2020-7-22
const { Query } = require('wood-query')();
const mongodb = require('mongodb');
const { ObjectId, AggregationCursor } = mongodb;
let dbs = {};

class Mongo {
  constructor(tbname, db = 'master') {
    this.tableName = tbname;
    this.db = db;
    if(dbs[this.db]) {
      this.collection = dbs[this.db].collection(this.tableName);
    }else{
      throw WOOD.error('mongodb failed: db=null');
    }
  }
  // 获取
  _getParams(obj = {}) {
    if (!obj.where) obj = { where: obj };
    let query = obj._isQuery ? obj : new Query(obj);
    let result = query.toJSON();
    if(result.where._id){
      if(typeof result.where._id === 'string'){
        result.where._id = ObjectId(result.where._id);
      }else if(typeof result.where._id === 'object'){
        if(result.where._id.$in) result.where._id.$in = result.where._id.$in.map(val => ObjectId(val));
        if(result.where._id.$eq) result.where._id.$eq = ObjectId(result.where._id.$eq);
      }
    }
    if(result.aggregate){
      result.aggregate.forEach(item => {
        if(item['$match'] && item['$match']['_id']){
          for(let key in item['$match']['_id']){
            if(key === '$in') item['$match']['_id']['$in'] = item['$match']['_id']['$in'].map(val => ObjectId(val))
            if(key === '$eq') item['$match']['_id']['$eq'] = ObjectId(item['$match']['_id']['$eq'])
          }
        }
      })
    }
    return result;
  }
  // 自增id
  async rowid(tbName){
    let idsTable = dbs[this.db].collection('ids');
    let result = await idsTable.findOneAndUpdate({"name":tbName || this.tableName}, {$inc:{'id':1}}, {
        upsert: true,
        returnOriginal: false
      });
    return result.value.id;
  }
  // 建索引
  index(data = {}, opts = {}) {
    if (WOOD.config.env === 'development') console.warn(`建立索引: ${JSON.stringify(data)}`);
    this.collection.createIndex(data, {...opts});
  }
  // 查询全部记录
  find(params = {}) {
    let data = this._getParams(params);
    let query = this.collection.find(data.where, {projection: data.select })
    if(data.skip) query = query.skip(data.skip)
    return query.limit(data.limit).sort(data.sort).toArray()
  }
  // 查询单条记录
  findOne(params = {}) {
    let data = this._getParams(params);
    return this.collection.findOne(data.where, {projection: data.select });
  }
  // 删除
  remove(params = {}) {
    let data = this._getParams(params);
    return this.collection.deleteMany(data.where);
  }
  // 删除
  deleteOne(params = {}, opts = {}) {
    let data = this._getParams(params);
    return this.collection.deleteOne(data.where, opts);
  }
  // 清空
  clear() {
    return this.remove({});
  }
  // 查找并更新
  findOneAndUpdate(params = {}, val = {}, opts = {}) {
    let data = this._getParams(params);
    return this.collection.findOneAndUpdate(data.where, val, opts);
  }
  // 更新
  update(params = {}, val = {}, opts = {}) {
    let data = this._getParams(params);
    return this.collection.updateOne(data.where, val, opts);
  }
  // 批量更新
  updateMany(params = {}, val = {}, opts = {}) {
    let data = this._getParams(params);
    return this.collection.updateMany(data.where, val, opts);
  }

  startSession(opts = {}) {
    return this.client.startSession(opts)
  }
  // 新增记录
  create(data = {}) {
    if(Array.isArray(data)){
      return this.collection.insertMany(data);
    }else{
      return this.collection.insertOne(data);
    }
  }
  // 计算总数
  count(params = {}) {
    let data = this._getParams(params);
    return this.collection.find(data.where).count();
  }
  //聚合
  aggregate(params = {}, options={}) {
    let data = this._getParams(params);
    return this.collection.aggregate(data.aggregate, options).toArray();
  }
  static connect(opts, name = 'master', callback) {
    let dbName = '';
    if(typeof opts === 'object'){
      let authStr, hostStr, readPreference;
      dbName = opts.dbName;
      authStr = `${opts.user && opts.password ? `${opts.user}:${opts.password}@` : ''}`;
      hostStr = Array.isArray(opts.host) ? opts.host.join(',') : `${opts.host}:${opts.port}`;
      readPreference = opts.readPreference ? `&readPreference=${opts.readPreference}` : '';
      opts = `mongodb://${authStr}${hostStr}/${opts.dbName}${opts.replset ? `?replicaSet=${opts.replset}${readPreference}` : ''}`;
    }else{
      let index = opts.indexOf('?replicaSet'), _opts = opts;
      if(index > 0) _opts = opts.slice(0, index);
      let optsArr = _opts.split('/');
      dbName = optsArr[optsArr.length - 1];
    }
    return new Promise((resolve, reject) => {
      mongodb.MongoClient.connect(opts, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
        if (err) {
          console.log(`MongoDB [${name}] failed :` + err.message);
          dbs[name] = null;
          if(callback) callback(err);
          reject(err);
        } else {
          console.log(`MongoDB [${name}] connected Successfull`);
          dbs[name] = client.db(dbName);
          if(callback) callback(null, dbs[name]);
          resolve(dbs[name]);
        }
      });
    });

  }
  static close(name = 'master'){
    dbs[name].close();
  }
}

module.exports = Mongo;

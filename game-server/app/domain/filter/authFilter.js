var authConfig = require('../auth/authConfig');
var tokenManager = require('../auth/token');
var Code = require('../code');
var pomelo = require('pomelo');
// var sessionManager = require('../sessionService.js');

module.exports = function() {
  return new Filter();
};

var Filter = function() {

};

Filter.prototype.before = function(msg, session, next) {
  var token = msg.token;
  //根据token获取uid
  var res = tokenManager.parse(token, authConfig.authSecret);
  if(!res) {
    next(null, Code.ENTRY.FA_TOKEN_INVALID);
    return;
  }
  // Token解析成功 开始验证数据
  var uid = res.uid;
  console.log('sessionUid::' + session.uid + "______token.uid::" + uid);
};



Filter.prototype.after = function(err, msg, session, resp, next) {

};
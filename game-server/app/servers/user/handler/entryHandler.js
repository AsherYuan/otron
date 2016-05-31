var async = require('async');
var authConfig = require('../../../domain/auth/authConfig');
var tokenManager = require('../../../domain/auth/token');
var Code = require('../../../domain/code');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

/**
 * New client entry.
 *
 * @param  {Object}   msg     request message-
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.entry = function(msg, session, next) {
  var self = this;
  var token = msg.token;
  var version = msg.version;
  var sessionService = self.app.get('sessionService');
  var channelService = self.app.get('channelService');
  var uid;

  //根据token获取uid
  var res = tokenManager.parse(token, authConfig.authSecret);
  if(!res) {
    next(null, Code.ENTRY.FA_TOKEN_INVALID);
    return;
  }
  // Token解析成功 开始验证数据
  var uid = res.uid;

  //查询数据库中有没有该用户
  AccountManager.getUserAccount(uid, function(err, accountInfo){
    if (err || !accountInfo){
      //出错，或者没找到用户
      cb(null, Code.FA_USER_NOT_EXIST, null);
      return;
    }

    cb(null, Code.OK, {'uid' : uid});
  });




  //根据token获取uid
  var res = tokenManager.parse(token, authConfig.authSecret);
  if(!res) {
    cb(null, Code.ENTRY.FA_TOKEN_INVALID);
    return;
  }
  var uid = res.uid;

  //查询数据库中有没有该用户
  AccountManager.getUserAccount(uid, function(err, accountInfo){
    if (err || !accountInfo){
      //出错，或者没找到用户
      cb(null, Code.FA_USER_NOT_EXIST, null);
      return;
    }

    cb(null, Code.OK, {'uid' : uid});
  });




  //duplicate log in
  if( !! sessionService.getByUid(uid)) {
    next(null, {
      code: 500,
      error: true
    });
    return;
  }

  session.bind(uid);
  session.set('rid', rid);
  session.push('rid', function(err) {
    if(err) {
      console.error('set rid for session service failed! error is : %j', err.stack);
    }
  });
  session.on('closed', function() {
    console.log('session closed');
  });

  //put user into channel
  self.app.rpc.centerbox.centerboxRemote.add(session, uid, self.app.get('serverId'), rid, true, function(){
    console.log(JSON.stringify(next));
    next(null, {
      msg:'连接成功'
    });
  });
};
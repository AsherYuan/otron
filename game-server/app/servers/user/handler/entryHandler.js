var authConfig = require('../../../domain/auth/authConfig');
var tokenManager = require('../../../domain/auth/token');
var Code = require('../../../domain/code');
var pomelo = require('pomelo');
var UserModel = require('../../../mongodb/models/UserModel');
var sessionManager = require('../../../domain/sessionService.js');
var StringUtil = require('../../../util/StringUtil.js');
var RegexUtil = require('../../../util/RegexUtil.js');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

/**
 * 账户验证
 *
 * @param  {Object}   msg     request message-
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.auth = function(msg, session, next) {
  var self = this;
  var token = msg.token;
  var version = msg.version;
  var sessionService = self.app.get('sessionService');
  var channelService = self.app.get('channelService');

  //根据token获取uid
  var res = tokenManager.parse(token, authConfig.authSecret);
  if(!res) {
    next(null, {code:Code.ENTRY.FA_TOKEN_INVALID});
    return;
  }
  // Token解析成功 开始验证数据
  var uid = res.uid;
  UserModel.find({"mobile":uid}, function(err, docs){
    if(err) console.log(err);
    else {
      // 用户没找到
      if(docs.length === 0) {
        next(null, {code:Code.ACCOUNT.USER_NOT_EXIST});
        return;
      } else {
        sessionManager.addSession(uid,{status:1, frontendId:session.frontendId});
        session.on('closed', onUserLeave.bind(null, self.app));
        session.bind(uid);
        // 将uid存入session中
        session.set('uid', uid);
        session.uid = uid;

        next(null, {code:Code.OK});
        return;
      }
    }
  });
};

Handler.prototype.login = function(msg, session, next) {
  var self = this;
  var mobile = msg.mobile;
  var password = msg.password;
  var sessionService = self.app.get('sessionService');
  var channelService = self.app.get('channelService');
  var uid = mobile;
  if(StringUtil.isBlank(mobile)) {
    next(null, {code:Code.ACCOUNT.MOBILE_IS_BLANK});
    return;
  } else if(StringUtil.isBlank(password)) {
    next(null, {code:Code.ACCOUNT.PASSWORD_IS_BLANK});
    return;
  } else {
    UserModel.find({"mobile":mobile}, function(err, docs) {
      if(err) {
        console.log(err);
      } else {
        // 用户不存在
        if(docs.length === 0) {
          next(null, {code:Code.ACCOUNT.USER_NOT_EXIST});
          return;
        } else {
          if(password === docs[0].password) {
            // 重复登录问题
            var sessionService = self.app.get('sessionService');
            //duplicate log in
            if( !! sessionService.getByUid(uid)) {
              next(null, {code:Code.ENTRY.DUPLICATED_LOGIN});
              return;
            }
            // 登录验证成功，处理session
            sessionManager.addSession(uid, {status:1, frontendId:session.frontendId});
            session.on('closed', onUserLeave.bind(null, self.app));
            session.bind(uid);
            // 将uid存入session中
            session.set('uid', uid);

            // 获取token返回
            var token = tokenManager.create(uid, authConfig.authSecret);
            next(null, {code:Code.OK, token:token});
            return;
          } else {
            next(null, {code:Code.ACCOUNT.PASSWORD_NOT_CORRECT});
            return;
          }
        }
      }
    });
  }
};

/**
 * 注册用户信息
 *
 * @param  {Object}   msg     request message-
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.register = function(msg, session, next) {
  var self = this;
  var mobile = msg.mobile;
  var username = msg.username;
  var password = msg.password;

  if(StringUtil.isBlank(mobile)) {
    next(null, {msg:'手机号码不能为空'});
  } else if(StringUtil.isBlank(username)) {
    next(null, {msg:'用户名不能为空'});
  } else if(StringUtil.isBlank(password)) {
    next(null, {msg:'密码不能为空'});
  } else if(!RegexUtil.checkPhone(mobile)) {
    next(null, {msg:'手机号码格式不正确'});
  } else {
    // 用户注册
    self.app.rpc.user.userRemote.register(session, mobile, username, password, function(msg) {
      next(null, {msg:msg});
    });
  }
};

/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
  if(!session || !session.uid) {
    return;
  }
  console.log('用户离开,session消除');
  sessionManager.delSession(session.uid);
};

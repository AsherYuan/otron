var StringUtil = require('../../../util/StringUtil.js');
var RegexUtil = require('../../../util/RegexUtil.js');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
  this.channelService = app.get('channelService');
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
 * 用户更新
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.updateUserInfo = function(msg, session, next) {
  var self = this;
  var name = msg.name;
  var mobile = msg.mobile;

  if(StringUtil.isBlank(name)) {
    next(null, {msg:'姓名不能为空'});
  } else {
    self.app.rpc.user.userRemote.updateUserInfo(session, mobile, name, function(msg) {
      if(msg === 0) {
        next(null, {msg:'修改成功'});
      }
    });
  }
};
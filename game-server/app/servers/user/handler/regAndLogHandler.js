var StringUtil = require('../../../utils/StringUtil.js');
var RegexUtil = require('../../../utils/RegexUtil.js');

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
        self.app.rpc.user.regAndLogRemote.register(session, mobile, username, password, function(msg) {
            next(null, {msg:msg});
        });
    }
};

/**
 * 用户登录
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.login = function(msg, session, next) {
    var self = this;
    var mobile = msg.mobile;
    var password = msg.password;

    if(StringUtil.isBlank(mobile)) {
        next(null, {msg:'手机号码不能为空'});
    } else if(StringUtil.isBlank(password)) {
        next(null, {msg:'密码不能为空'});
    } else {
        self.app.rpc.user.regAndLogRemote.login(session, mobile, password, function(msg) {
            var userFlag = 0;
            if(msg === 0) {
                // session处理
                var sessionService = self.app.get('sessionService');
                if( !! sessionService.getByUid(mobile)) {
                    next(null, {
                        code: 500,
                        error: true
                    });
                    return;
                }
                session.bind(mobile);
                session.set('rid', 'rid');
                session.push('rid', function(err) {
                    if(err) {
                        console.error('set rid for session service failed! error is : %j', err.stack);
                    }
                });
                msg = '登录成功';

                process.nextTick(function() {
                    self.app.rpc.user.regAndLogRemote.userInfoCheck(session, mobile, function(flag) {
                        var thisMsg = '';
                        if(flag === -1) {
                            thisMsg = '用户不存在';
                        } else if(flag === -2) {
                            thisMsg = '登录成功，基础信息不全';
                        } else if(flag === -3) {
                            thisMsg = '登录成功，小区信息不全';
                        }

                        var param = {
                            flag:flag,
                            msg:thisMsg,
                            uid:mobile
                        };
                        self.app.get('channelService').pushMessageByUids('onMsg', param, [{
                            uid: mobile,
                            sid: self.app.get('serverId')
                        }]);
                    });
                });
            } else if(msg === -1) {
                msg = '用户不存在';
            } else if(msg === -2) {
                msg = '密码错误';
            }
           next(null, {msg:msg, flag:userFlag});
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
        self.app.rpc.user.regAndLogRemote.updateUserInfo(session, mobile, name, function(msg) {
            if(msg === 0) {
                next(null, {msg:'修改成功'});
            }
        });
    }
};
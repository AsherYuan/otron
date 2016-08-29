var authConfig = require('../../../domain/auth/authConfig');
var tokenManager = require('../../../domain/auth/token');
var Code = require('../../../domain/code');
var pomelo = require('pomelo');
var UserModel = require('../../../mongodb/models/UserModel');
var sessionManager = require('../../../domain/sessionService.js');
var StringUtil = require('../../../util/StringUtil.js');
var RegexUtil = require('../../../util/RegexUtil.js');
var HomeModel = require('../../../mongodb/models/HomeModel');
var HomeWifiModel = require('../../../mongodb/models/HomeWifiModel');
var CenterBoxModel = require('../../../mongodb/models/CenterBoxModel');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
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
Handler.prototype.auth = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    var version = msg.version;
    var sessionService = self.app.get('sessionService');
    var channelService = self.app.get('channelService');
    //根据token获取uid
    var res = tokenManager.parse(token, authConfig.authSecret);
    if (!res) {
        next(null, Code.ENTRY.FA_TOKEN_INVALID);
        return;
    }
    // Token解析成功 开始验证数据
    var uid = res.uid;
    UserModel.find({"mobile": uid}, function (err, userDoc) {
        if (err) console.log(err);
        else {
            if (userDoc.length === 0) {
                next(null, Code.ACCOUNT.USER_NOT_EXIST);
                return;
            } else {
                var sessionService = self.app.get('sessionService');
                //duplicate log in
                if (!!sessionService.getByUid(uid)) {
                    self.app.get('channelService').pushMessageByUids('onMsg', {sysNotice:"您的帐号已在别的设备登录，强制下线"}, [{
                        uid: uid,
                        sid: 'user-server-1'
                    }]);
                    sessionService.kick(uid, function() {});
                }
                sessionManager.addSession(uid, {status: 1, frontendId: session.frontendId});
                session.on('closed', onUserLeave.bind(null, self.app));
                session.bind(uid);
                // 将uid存入session中
                session.set('uid', uid);
                session.uid = uid;

                // TODO 与userHandler中的getUserInfo合并到UserRemote中取去
                HomeModel.find({userMobile: uid}, function (err, homeDocs) {
                    if (err) {
                        console.log(err);
                        next(null, Code.DATABASE);
                    } else {
                        HomeWifiModel.find({usermobile: uid}, function (err, homeWifiDocs) {
                            if (err) {
                                console.log(err);
                                next(null, Code.DATABASE);
                            } else {
                                CenterBoxModel.find({userMobile: uid}, function (err, centerBoxDocs) {
                                    if (err) {
                                        console.log(err);
                                        next(null, Code.DATABASE);
                                    } else {
                                        userDoc.homeInfo = homeDocs;
                                        userDoc.centerBox = centerBoxDocs;
                                        userDoc.homeWifi = homeWifiDocs;

                                        var ret = Code.OK;
                                        ret.data = userDoc;
                                        next(null, ret);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    });
};

Handler.prototype.login = function (msg, session, next) {
    var self = this;
    var mobile = msg.mobile;
    var password = msg.password;
    var sessionService = self.app.get('sessionService');
    var channelService = self.app.get('channelService');
    var uid = mobile;
    if (StringUtil.isBlank(mobile)) {
        next(null, Code.ACCOUNT.MOBILE_IS_BLANK);
        return;
    } else if (StringUtil.isBlank(password)) {
        next(null, Code.ACCOUNT.PASSWORD_IS_BLANK);
        return;
    } else {
        UserModel.find({"mobile": mobile}, function (err, docs) {
            if (err) {
                console.log(err);
            } else {
                // 用户不存在
                if (docs.length === 0) {
                    next(null, Code.ACCOUNT.USER_NOT_EXIST);
                    return;
                } else {
                    if (password === docs[0].password) {
                        // 重复登录问题
                        var sessionService = self.app.get('sessionService');
                        //duplicate log in
                        if (!!sessionService.getByUid(uid)) {
                            self.app.get('channelService').pushMessageByUids('onMsg', {sysNotice:"您的帐号已在别的设备登录，强制下线"}, [{
                                uid: uid,
                                sid: 'user-server-1'
                            }]);
                            sessionService.kick(uid);
                        }
                        // 登录验证成功，处理session
                        sessionManager.addSession(uid, {status: 1, frontendId: session.frontendId});
                        session.on('closed', onUserLeave.bind(null, self.app));
                        session.bind(uid);
                        // 将uid存入session中
                        session.set('uid', uid);

                        // 获取token返回
                        var token = tokenManager.create(uid, authConfig.authSecret);
                        var ret = Code.OK;
                        ret.token = token;
                        next(null, ret);
                        return;
                    } else {
                        next(null, Code.ACCOUNT.PASSWORD_NOT_CORRECT);
                        return;
                    }
                }
            }
        });
    }
};


Handler.prototype.manageLogin = function (msg, session, next) {
    var self = this;
    var username = msg.username;
    var password = msg.password;
    var sessionService = self.app.get('sessionService');
    var channelService = self.app.get('channelService');
    if(username == "admin" && password == "orz123") {
        var sessionService = self.app.get('sessionService');
        // 登录验证成功，处理session
        sessionManager.addSession("admin", {status: 1, frontendId: session.frontendId});
        session.on('closed', onUserLeave.bind(null, self.app));
        session.bind(username);
        // 将uid存入session中
        session.set('adminUsername', username);

        // 获取token返回
        var token = tokenManager.create(username, authConfig.authSecret);
        var ret = Code.OK;
        ret.token = token;
        next(null, ret);
    } else {
        next(null, Code.ACCOUNT.PASSWORD_NOT_CORRECT);
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
Handler.prototype.register = function (msg, session, next) {
    var self = this;
    var mobile = msg.mobile;
    var username = msg.username;
    var password = msg.password;

    if (StringUtil.isBlank(mobile)) {
        next(null, Code.ACCOUNT.MOBILE_IS_BLANK);
    } else if (StringUtil.isBlank(username)) {
        next(null, Code.ACCOUNT.USERNAME_IS_BLANK);
    } else if (StringUtil.isBlank(password)) {
        next(null, Code.ACCOUNT.PASSWORD_IS_BLANK);
    } else if (!RegexUtil.checkPhone(mobile)) {
        next(null, Code.ACCOUNT.MOBILE_IS_BLANK);
    } else {
        // 用户注册
        self.app.rpc.user.userRemote.register(session, mobile, username, password, function (msg) {
            var ret = Code.OK;
            ret.msg = msg;
            next(null, ret);
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
var onUserLeave = function (app, session) {
    if (!session || !session.uid) {
        return;
    }
    console.log('用户离开,session消除 [' + session.uid + ']');
    sessionManager.delSession(session.uid);
};
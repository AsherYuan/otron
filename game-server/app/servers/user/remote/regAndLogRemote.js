var UserModel = require('../../../mongodb/models/UserModel.js');
var StringUtil = require('../../../utils/StringUtil.js');

module.exports = function (app) {
    return new RegAndLogRemote(app);
};

var RegAndLogRemote = function (app) {
    this.app = app;
    this.channelService = app.get('channelService');
};

/**
 * 用户注册
 *
 * @param {String} mobile 手机号码
 * @param {String} username 用户名
 * @param {String} password 密码
 *
 */
RegAndLogRemote.prototype.register = function (mobile, username, password, cb) {
    UserModel.find({$or: [{'mobile': mobile}, {'username': username}]}, function (err, docs) {
        if (err) {
            console.log('UserModel.prototype.find:err:' + JSON.stringify(err));
            cb('注册成功');
        } else {
            if (docs.length === 0) {
                var UserEntity = new UserModel({
                    mobile: mobile, username: username, password: password
                });
                UserEntity.save(function (err, docs) {
                    if (err) {
                        console.log('UserModel.prototype.save:err:' + JSON.stringify(err));
                        cn('注册失败');
                    } else {
                        cb('注册成功');
                    }
                });
            } else {
                cb('手机号码或用户名重复');
            }
        }
    });
};

RegAndLogRemote.prototype.login = function (mobile, password, cb) {
    UserModel.find({'mobile': mobile}, function (err, docs) {
        if (err) {
            console.log("RegAndLogRemote.prototype.login:err:" + err);
        } else if (docs.length === 0) {
            cb(-1);
        } else {
            if (password === docs[0].password) {
                var conditions = {mobile : mobile};
                var update     = {$set : {lastLoginTime : new Date()}};
                UserModel.update(conditions, update, null, function(error){
                    if(error) {
                        console.log(error);
                    } else {
                        cb(0);
                    }
                });
            } else {
                cb(-2);
            }
        }
    });
};

RegAndLogRemote.prototype.userInfoCheck = function (mobile, cb) {
    UserModel.find({'mobile': mobile}, function (err, docs) {
        if (err) console.log('RegAndLogRemote.prototype.userInfoCheck:err' + err);
        else {
            if (docs.length === 0) {
                cb(-1);
            } else {
                var user = docs[0];
                if (StringUtil.isBlank(user.name)) {
                    cb(-2);
                } else if (StringUtil.isBlank(user.floorId)) {
                    cb(-3);
                }
            }
        }
    });
};

RegAndLogRemote.prototype.updateUserInfo = function (mobile, name, cb) {
    var conditions = {mobile : mobile};
    var update     = {$set : {name : name}};
    UserModel.update(conditions, update, null, function(error){
        if(error) {
            console.log(error);
        } else {
            cb(0);
        }
    });
};
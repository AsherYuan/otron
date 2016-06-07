var StringUtil = require('../../../util/StringUtil.js');
var RegexUtil = require('../../../util/RegexUtil.js');
var UserModel = require('../../../mongodb/models/UserModel');
var Code = require('../../../domain/code');
var HomeModel = require('../../../mongodb/models/HomeModel');
var HomeGridModel = require('../../../mongodb/models/HomeGridModel');
var FloorModel = require('../../../mongodb/models/FloorModel');
var FloorModelModel = require('../../../mongodb/models/FloorModelModel');
var DeviceBrandModel = require('../../../mongodb/models/DeviceBrandModel');

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
  var mobile = session.uid;
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

/**
 * 获取用户信息
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getUserInfo = function(msg, session, next) {
  var self = this;
  var uid = session.uid;
  UserModel.find({mobile:uid}, function(err, docs) {
    if(err) console.log(err);
    else {
      if(docs.length == 1) {
        next(null, {userInfo:docs[0]});
      } else {
        next(null, {err:Code.ACCOUNT.USER_NOT_EXIST});
      }
    }
  });
};

/**
 获取用户的家庭信息
 */
Handler.prototype.getHomeInfo = function(msg, session, next) {
  var self = this;
  var uid = session.uid;
  HomeModel.find({userMobile : uid}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, docs);
    }
  });
};

/**
 * 根据家庭楼层，获取房间
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getHomeGridList = function(msg, session, next) {
  var self = this;
  var uid = session.uid;
  var homeId = msg.homeId;
  var layerName = msg.layerName;
  HomeGridModel.find({homeId:homeId, layerName:layerName}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, docs);
    }
  });
}

/**
 * 根据区域获取小区列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getFloorList = function(msg, session, next) {
  var self = this;
  var area = msg.area;
  FloorModel.find({area: area}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, docs);
    }
  });
};

/**
 * 根据小区获取户型列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getFloorModelList = function(msg, session, next) {
  var self = this;
  var floorUrl = msg.floorUrl;
  FloorModelModel.find({floorUrl: floorUrl}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, docs);
    }
  });
};

/**
 * 获取房间详情
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getGridDetail = function(msg, session, next) {
  var self = this;
  var gridId = msg.gridId;
  HomeGridModel.findOne({_id:gridId}, function(err, doc) {
    if(err) console.log(err);
    else {
      // 所有设备列表
      next(null, doc);
    }
  });
};

/**
 * 更新房间名称
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.setGridName = function(msg, session, next) {
  var self = this;
  var gridId = msg.gridId;
  var name = msg.name;
  HomeGridModel.update({_id:gridId}, {$set:{name:name}}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, docs);
    }
  });
}

/**
 * 绑定用户的户型
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.confirmModel = function(msg, session, next) {
  var self = this;
  var room = msg.room;
  var hall = msg.hall;
  var toilet = msg.toilet;
  var kitchen = msg.kitchen;
  var name = msg.name;
  var floorId = msg.floorId;
  var floorName = msg.floorName;
  var userMobile = session.uid;

  HomeModel.find({userMobile:userMobile}, function(err, docs) {
    if(err) console.log(err);
    else {
      // 新建
      if(docs.length === 0) {
        var homeEntity = new HomeModel({
          floorId: floorId,
          floorName: floorName,
          userMobile:userMobile,
          layers:[{
            name:name,
            room:room,
            hall:hall,
            toilet:toilet,
            kitchen:kitchen
          }]
        });
        homeEntity.save(function(err, data) {
          if(err) console.log(err);
          else {
            resolveHomeGrids(data._id, name, room, hall, toilet, kitchen);
            next(null, Code.OK);
          }
        });
      }
    }
  });
};

/**
 * 获取设备类型列表
 */
Handler.prototype.getDeviceTypes = function(msg, session, next) {
  var types = [{name:'空调'},{name:'电视'},{name:'电灯'},{name:'窗帘'}]
  next(null, types);
};

/**
 * 根据类型获取品牌列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getDeviceBrands = function(msg, session, next) {
  var type = msg.type;

  DeviceBrandModel.find({'type':type}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, docs);
    }
  });
}

/**
 * 添加新设备
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.addNewDevice = function(msg, session, next) {

};

var resolveHomeGrids = function(homeId, layerName, room, hall, toilet, kitchen) {
  for(var i=1;i<=room;i++) {
    new HomeGridModel({homeId:homeId, layerName:layerName, gridType:'room', dorder: i}).save(function(err, doc) {});
  }

  for(var j=1;j<=hall;j++) {
    new HomeGridModel({homeId:homeId, layerName:layerName, gridType:'hall', dorder: j}).save(function(err, doc) {});
  }

  for(var k=1;k<=toilet;k++) {
    new HomeGridModel({homeId:homeId, layerName:layerName, gridType:'toilet', dorder: k}).save(function(err, doc) {});
  }

  for(var l=1;l<=kitchen;l++) {
    new HomeGridModel({homeId:homeId, layerName:layerName, gridType:'kitchen', dorder: l}).save(function(err, doc) {});
  }
}
var StringUtil = require('../../../util/StringUtil.js');
var RegexUtil = require('../../../util/RegexUtil.js');
var UserModel = require('../../../mongodb/models/UserModel');
var Code = require('../../../domain/code');
var HomeModel = require('../../../mongodb/models/HomeModel');
var HomeGridModel = require('../../../mongodb/models/HomeGridModel');
var FloorModel = require('../../../mongodb/models/FloorModel');
var FloorModelModel = require('../../../mongodb/models/FloorModelModel');
var DeviceBrandModel = require('../../../mongodb/models/DeviceBrandModel');
var DeviceModel = require('../../../mongodb/models/DeviceModel');
var UserEquipmentModel = require('../../../mongodb/models/UserEquipment');
var HomeWifiModel = require('../../../mongodb/models/HomeWifiModel');
var CenterBoxModel = require('../../../mongodb/models/CenterBoxModel');
var TerminalModel = require('../../../mongodb/models/TerminalModel');
var async = require("async");
var http = require('http');
var DeviceStatusUtil = require('../../../util/DeviceStatusUtil');
var SensorDataModel = require('../../../mongodb/models/SensorDataModel');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
  this.channelService = app.get('channelService');
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
  UserModel.findOne({mobile:uid}, function(err, userDoc) {
    if(err) console.log(err);
    else {
      if( !! userDoc) {
        HomeModel.find({userMobile:uid}, function(err, homeDocs) {
          if(err) console.log(err);
          else {
            HomeWifiModel.find({usermobile:uid}, function(err, homeWifiDocs) {
              if(err) console.log(err);
              else {
                CenterBoxModel.find({userMobile:uid}, function(err, centerBoxDocs) {
                  if(err) console.log(err);
                  else {
                    userDoc.homeInfo = homeDocs;
                    userDoc.centerBox = centerBoxDocs;
                    userDoc.homeWifi = homeWifiDocs;

                    next(null, {userInfo:userDoc});
                  }
                });
              }
            });
          }
        });
      } else {
        next(null, {err:Code.ACCOUNT.USER_NOT_EXIST});
      }
    }
  });
};



/**
 * 根据用户手机号码获取终端列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.queryTerminal = function(msg, session, next) {
  var self = this;
  var centerBoxSerialno = msg.centerBoxSerialno;
  var params = {centerBoxSerialno:centerBoxSerialno};
  var code = msg.code;
  if( !! code) {
    params = {
      centerBoxSerialno:centerBoxSerialno,
      code:code
    }
  }
  TerminalModel.find(params, function(err, docs) {
    next(null, docs);
  });
};

Handler.prototype.queryDevices = function(msg, session, next) {
  var self = this;

  var userMobile = session.uid;
  HomeModel.find({userMobile:userMobile}, function(err, docs) {
    if(!! docs) {
      var ids = [];
      for(var i=0;i<docs.length;i++) {
        ids.push(docs[i]._id);
      }
      UserEquipmentModel.find({home_id:{$in:ids}}, function(err, devices) {
        console.log(JSON.stringify(devices));
        next(null, devices);
      });
    }
  });
};

Handler.prototype.getDeviceList = function(msg, session, next) {
  var self = this;

  var userMobile = session.uid;
  var homeId = msg.homeId;
  var layerName = msg.layerName;

  UserEquipmentModel.find({homeId:homeId, layerName:layerName}, function(err, devices) {
    next(null, devices);
  });
};

Handler.prototype.getDeviceListByGridId = function(msg, session, next) {
  var self = this;

  var homeGridId = msg.homeGridId;

  DeviceModel.find({homeGridId:homeGridId}, function(err, devices) {
    next(null, devices);
  });
}



Handler.prototype.bindCenterBoxToLayer = function(msg, session, next) {
  var self = this;
  var homeId = msg.homeId;
  var centerBoxSerialno = msg.centerBoxSerialno;
  var layerName = msg.layerName;

  HomeModel.update({_id:homeId, "layers.name":layerName}, {$set:{"layers.$.centerBoxSerialno":centerBoxSerialno}}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, Code.OK);
    }
  });
}

Handler.prototype.bindTerminalToHomeGrid = function(msg, session, next) {
  var self = this;
  var homeGridId = msg.homeGridId;
  var terminalId = msg.terminalId;

  HomeGridModel.update({_id:homeGridId}, {$set:{"terminalId":terminalId}}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, Code.OK);
    }
  });

  TerminalModel.update({_id:terminalId}, {$set:{"homeGridId":homeGridId}}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, Code.OK);
    }
  });
}


/**
 * 初始化链接中控
 */
Handler.prototype.simulateConnCenterBox = function(msg, session, next) {
  var self = this;
  var uid = session.uid;
  var ssid = msg.ssid;
  var passwd = msg.passwd;
  var serialno = msg.serialno;

  var CenterBoxEntity = new CenterBoxModel({userMobile:uid, ssid:ssid, passwd:passwd, serialno:serialno});
  CenterBoxEntity.save(function(err) {
    if(err) console.log(err);
    else {
      next(null);
    }
  })
}

/**
 * 初始化链接终端
 */
Handler.prototype.simulateConnTerminal = function(msg, session, next) {
  var self = this;
  var uid = session.uid;
  var ssid = msg.ssid;
  var passwd = msg.passwd;
  var serialno = msg.serialno;
  var centerBoxSerialno = msg.centerBoxSerialno;
  // var entity = new TerminalModel({userMobile:uid, ssid:ssid, passwd:passwd, serialno:serialno, centerBoxSerialno:centerBoxSerialno});
  // entity.save(function(err) {
  //   if(err) console.log(err);
  //   else {
  //     next(null);
  //   }
  // })
}

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
  var centerBoxSerialno = msg.centerBoxSerialno;

  HomeGridModel.find({homeId:homeId, layerName:layerName}, function(err, grids) {
    if(err) console.log(err);
    else {
      var gridCount = (!!grids) ? grids.length : 0;
      var gridIndex = 0;
      for(var i=0;i<grids.length;i++) {
        TerminalModel.findOne({homeGridId:grids[i]._id}, function(err, terminal) {
          grids[gridIndex].terminal = terminal;
          gridIndex ++;
          if(gridIndex === gridCount) {
            next(null, {docs:grids, centerBoxSerialno:centerBoxSerialno, layerName:layerName, homeId:homeId});
          }
        });
      }
    }
  });
};

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
};

Handler.prototype.saveNewDevice = function(msg, session, next) {
  var terminalId = msg.terminalId;
  var homeId = msg.homeId;
  var layerName = msg.layerName;
  var homeGridId = msg.gridId;
  var type = msg.type;
  var brand = msg.brand;
  var name = msg.name;

  // 设备初始化状态添加,各种状态的调整和解读
  var status = DeviceStatusUtil.getInitStatus(type);

  var userEquipmentEntity = new UserEquipmentModel({
    e_name:name,
    terminalId:terminalId,
    home_id:homeId,
    layerName:layerName,
    homeGridId:homeGridId,
    e_type:type,
    pingpai:brand,
    status:status.power,
    ac_model:status.mode,
    ac_windspeed:status.wind,
    ac_temperature:status.temerature
  });

  userEquipmentEntity.save(function(err) {
    if(err) console.log(err);
    else {
      next(null, Code.OK);
    }
  });
};

Handler.prototype.deleteDevice = function(msg, session, next) {
  var deviceId = msg.deviceId;

  UserEquipmentModel.remove({_id:deviceId}, function(err, docs) {
    if(err) console.log(err);
    else {
      next(null, Code.OK);
    }
  })
}

/**
 * 绑定用户家庭的路由器信息
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.bindUserHomeWifi = function(msg, session, next) {
  var type = msg.type;
  var ssid = msg.ssid;
  var passwd = msg.passwd;
  var uid = session.uid;

  var homeWifiEntity = new HomeWifiModel({ssid:ssid, passwd:passwd, usermobile:uid});
  homeWifiEntity.save(function(err) {
    next(null, Code.OK);
  });
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
};

/**
 * 前台用户发出语音指令
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.userSaySomething = function(msg, session, next) {
  var uid = session.uid;
  var words = msg.words;

  HomeModel.find({userMobile:uid}, function(err, docs) {
    if(err) console.log(docs);
    else {
      // TODO 选择homeId, 语言模式上调整
      if(!! docs) {
        var homeId = docs[0]._id;
        // var data = {
        //   str: words,
        //   user_id:uid,
        //   home_id:homeId
        // };

        var data = {
          str: words,
          user_id:'0001',
          home_id:'h0001'
        };
        // var data = 'str=' + words + '&user_id=' + uid + '&home_id=' + homeId;
        data = require('querystring').stringify(data);
        console.log(data);
        var opt = {
          method: "POST",
          host: "122.225.88.66",
          port: 8180,
          // host: "192.168.1.178",
          // port: 8080,
          path: "/SpringMongod/main/ao",
          headers: {
            "Content-Type": 'application/x-www-form-urlencoded',
            "Content-Length": data.length
          }
        };

        var req = http.request(opt, function (res) {
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
            next(null, chunk);
          });
        });

        req.on('error', function (e) {
          console.log('problem with request: ' + e.message);
        });

        req.write(data);
        req.end();

      }
    }
  });
};

/**
 * 用户发出遥控指令
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.remoteControll = function(msg, session, next) {

  // 目前写死一个设备
  var user_id = '0001';
  var deviceId = '57674899739656f253648363';
  // var deviceType = msg.type == '空调' ? '空调' : msg.type == '电视' ? '电视' : '其他';
  var deviceType = '空调';
  var status = msg.status;
  var model = msg.model;
  var ac_windspeed = msg.ac_windspeed;
  var ac_temperature = msg.ac_temperature;
  var num = msg.num;
  var chg_voice = msg.chg_voice;
  var chg_chn = msg.chg_chn;

  var data = {
    user_id: user_id,
    deviceId:deviceId,
    deviceType:deviceType,
    status:status,
    model:model,
    ac_windspeed:ac_windspeed,
    ac_temperature:ac_temperature,
    num:num,
    chg_voice:chg_voice,
    chg_chn:chg_chn
  };
  data = require('querystring').stringify(data);
  console.log(data);
  var opt = {
    method: "POST",
    host: "122.225.88.66",
    port: 8180,
    // host: "192.168.1.178",
    // port: 8080,
    path: "/SpringMongod/main/getorder",
    headers: {
      "Content-Type": 'application/x-www-form-urlencoded',
      "Content-Length": data.length
    }
  };

  var req = http.request(opt, function (res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      next(null, chunk);
    });
  });

  req.on('error', function (e) {
    console.log('problem with request: ' + e.message);
  });

  req.write(data);
  req.end();
};

Handler.prototype.getSensorDatas = function(msg, session, next) {
  var uid = session.uid;
  var centerBoxId = msg.centerBoxId;
  // TODO 排序
  SensorDataModel.find({centerBoxId:centerBoxId}, "-_id -centerBoxId", function(err, docs) {
    next(null, docs);
  });
};


Handler.prototype.getUserList = function(msg, session, next) {
  var self = this;
  var sessionService = this.app.get('sessionService');
  var uidMap = sessionService.service.uidMap;

  UserModel.find({}, function(err, docs) {
    if(err) console.log(err);
    else {
      var users = [];
      for(var i=0;i<docs.length;i++) {
        var flag = false;
        for(var data in uidMap){
          if(docs[i].mobile === data) {
            flag = true;
          }
        }
        users.push({"online":flag, "user":docs[i]});
      }
      next(null, users);
    }
  });
};

Handler.prototype.sendNotice = function(msg, session, next) {
  var self = this;
  var userMobile = msg.userMobile;
  var userMsg = msg.userMsg;

  var param = {"command":"notice", "userMsg":userMsg};

  self.app.get('channelService').pushMessageByUids('onMsg', param, [{
    uid: userMobile,
    sid: 'user-server-1'
  }]);
};

Handler.prototype.delayNotify = function(msg, session, next) {
  var self = this;
  var uid = msg.uid;
  var content = msg.content;
  var param = {
    command:'6000',
    content:content
  };
  console.log(JSON.stringify(msg));
  self.app.get('channelService').pushMessageByUids('onMsg', param, [{
    uid: uid,
    sid: 'user-server-1'
  }]);

  next(null, Code.OK);
}
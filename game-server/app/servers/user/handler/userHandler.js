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
var UserEquipmentModel = require('../../../mongodb/models/UserEquipmentModel');
var HomeWifiModel = require('../../../mongodb/models/HomeWifiModel');
var CenterBoxModel = require('../../../mongodb/models/CenterBoxModel');
var TerminalModel = require('../../../mongodb/models/TerminalModel');
var async = require("async");
var http = require('http');
var DeviceStatusUtil = require('../../../util/DeviceStatusUtil');
var SensorDataModel = require('../../../mongodb/models/SensorDataModel');
var request = require('request');
var RDeviceModel = require('../../../mongodb/models/RDeviceModel');
var SayingUtil = require('../../../domain/SayingUtil');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    this.channelService = app.get('channelService');
};

/**
 * 用户更新
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.updateUserInfo = function (msg, session, next) {
    var self = this;
    var name = msg.name;
    var mobile = session.uid;
    if (StringUtil.isBlank(name)) {
        next(null, Code.ACCOUNT.NAME_IS_BLANK);
    } else {
        self.app.rpc.user.userRemote.updateUserInfo(session, mobile, name, function (msg) {
            if (msg === 0) {
                next(null, Code.OK);
            } else {
                next(null, Code.DATABASE);
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
Handler.prototype.getUserInfo = function (msg, session, next) {
    var uid = session.uid;
    UserModel.findOne({mobile: uid}, function (err, userDoc) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            if (!!userDoc) {
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
            } else {
                next(null, Code.ACCOUNT.USER_NOT_EXIST);
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
Handler.prototype.queryTerminal = function (msg, session, next) {
    var centerBoxSerialno = msg.centerBoxSerialno;
    var params = {centerBoxSerialno: centerBoxSerialno};
    var code = msg.code;
    if (!!code) {
        params = {
            centerBoxSerialno: centerBoxSerialno,
            code: code
        };
        TerminalModel.find(params, function (err, docs) {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        });
    } else {
        TerminalModel.find(params, function (err, docs) {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        });
    }
};

Handler.prototype.queryDevices = function (msg, session, next) {
    var userMobile = session.uid;
    HomeModel.find({userMobile: userMobile}, function (err, docs) {
        if (!!docs) {
            var ids = [];
            for (var i = 0; i < docs.length; i++) {
                ids.push(docs[i]._id);
            }
            UserEquipmentModel.find({home_id: {$in: ids}}, function (err, docs) {
                if (err) {
                    console.log(err);
                    next(null, Code.DATABASE);
                } else {
                    var ret = Code.OK;
                    ret.data = docs;
                    next(null, ret);
                }
            });
        } else {
            next(null, Code.DATABASE);
        }
    });
};

Handler.prototype.getDeviceList = function (msg, session, next) {
    var self = this;

    var userMobile = session.uid;
    var homeId = msg.homeId;
    var layerName = msg.layerName;

    // {home_id: homeId, layerName: layerName}
    UserEquipmentModel.find({}).populate('homeGridId').exec(function(err, docs) {
        console.log(docs);
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

Handler.prototype.getDeviceListByGridId = function (msg, session, next) {
    var self = this;

    var homeGridId = msg.homeGridId;

    DeviceModel.find({homeGridId: homeGridId}, function (err, devices) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = devices;
            next(null, ret);
        }
    });
}


Handler.prototype.bindCenterBoxToLayer = function (msg, session, next) {
    var self = this;
    var homeId = msg.homeId;
    var centerBoxSerialno = msg.centerBoxSerialno;
    var layerName = msg.layerName;

    HomeModel.update({
        _id: homeId,
        "layers.name": layerName
    }, {$set: {"layers.$.centerBoxSerialno": centerBoxSerialno}}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            next(null, Code.OK);
        }
    });
}

Handler.prototype.bindTerminalToHomeGrid = function (msg, session, next) {
    var self = this;
    var homeGridId = msg.homeGridId;
    var terminalId = msg.terminalId;

    HomeGridModel.update({_id: homeGridId}, {$set: {"terminalId": terminalId}}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            TerminalModel.update({_id: terminalId}, {$set: {"homeGridId": homeGridId}}, function (err, docs) {
                if (err) {
                    console.log(err);
                    next(null, Code.DATABASE);
                } else {
                    next(null, Code.OK);
                }
            });
        }
    });


}


/**
 * 初始化链接中控
 */
Handler.prototype.simulateConnCenterBox = function (msg, session, next) {
    var self = this;
    var uid = session.uid;
    var ssid = msg.ssid;
    var passwd = msg.passwd;
    var serialno = msg.serialno;

    var CenterBoxEntity = new CenterBoxModel({userMobile: uid, ssid: ssid, passwd: passwd, serialno: serialno});
    CenterBoxEntity.save(function (err) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            next(null, Code.OK);
        }
    })
}

/**
 * 初始化链接终端
 */
Handler.prototype.simulateConnTerminal = function (msg, session, next) {
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
Handler.prototype.getHomeInfo = function (msg, session, next) {
    var self = this;
    var uid = session.uid;
    HomeModel.find({userMobile: uid}, function (err, docs) {
        if (err) console.log(err);
        else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

/**
 * 根据家庭楼层，获取房间
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getHomeGridList = function (msg, session, next) {
    var self = this;
    var uid = session.uid;
    var homeId = msg.homeId;
    var layerName = msg.layerName;
    var centerBoxSerialno = msg.centerBoxSerialno;
    HomeGridModel.find({homeId: homeId, layerName: layerName}, function (err, grids) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var gridCount = (!!grids) ? grids.length : 0;
            var gridIndex = 0;
            for (var i = 0; i < grids.length; i++) {
                TerminalModel.findOne({homeGridId: grids[i]._id}, function (err, terminal) {
                    grids[gridIndex].terminal = terminal;
                    gridIndex++;
                    if (gridIndex === gridCount) {
                        var ret = Code.OK;
                        ret.data = {
                            docs: grids,
                            centerBoxSerialno: centerBoxSerialno,
                            layerName: layerName,
                            homeId: homeId
                        };
                        next(null, ret);
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
Handler.prototype.getFloorList = function (msg, session, next) {
    var self = this;
    var area = msg.area;
    FloorModel.find({area: area}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

/**
 * 根据小区获取户型列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getFloorModelList = function (msg, session, next) {
    var self = this;
    var floorUrl = msg.floorUrl;
    FloorModelModel.find({floorUrl: floorUrl}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

/**
 * 获取房间详情
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getGridDetail = function (msg, session, next) {
    var self = this;
    var gridId = msg.gridId;
    HomeGridModel.findOne({_id: gridId}, function (err, doc) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

/**
 * 更新房间名称
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.setGridName = function (msg, session, next) {
    var self = this;
    var gridId = msg.gridId;
    var name = msg.name;
    HomeGridModel.update({_id: gridId}, {$set: {name: name}}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
}

/**
 * 绑定用户的户型
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.confirmModel = function (msg, session, next) {
    var self = this;
    var room = msg.room;
    var hall = msg.hall;
    var toilet = msg.toilet;
    var kitchen = msg.kitchen;
    var name = msg.name;
    var floorId = msg.floorId;
    var floorName = msg.floorName;
    var userMobile = session.uid;

    HomeModel.find({userMobile: userMobile}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            // 新建
            if (docs.length === 0) {
                var homeEntity = new HomeModel({
                    floorId: floorId,
                    floorName: floorName,
                    userMobile: userMobile,
                    layers: [{
                        name: name,
                        room: room,
                        hall: hall,
                        toilet: toilet,
                        kitchen: kitchen
                    }]
                });
                homeEntity.save(function (err, data) {
                    if (err) console.log(err);
                    else {
                        resolveHomeGrids(data._id, name, room, hall, toilet, kitchen);
                        // next(null, Code.OK);
                    }
                });
            }
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

/**
 * 获取设备类型列表
 */
Handler.prototype.getDeviceTypes = function (msg, session, next) {
    var types = [{name: '空调'}, {name: '电视'}, {name: '电灯'}, {name: '窗帘'}]
    var ret = Code.OK;
    ret.data = types;
    next(null, ret);
};

/**
 * 根据类型获取品牌列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getDeviceBrands = function (msg, session, next) {
    var type = msg.type;
    RDeviceModel.distinct("brand", {devType:type}, function(err, docs) {
        if(err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};

/**
 * 根据设备品牌获得型号列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getDeviceModels = function (msg, session, next) {
    var brand = msg.brand;
    var type = msg.type;
    RDeviceModel.distinct("typeName", {brand:brand}, function(err, docs) {
        if(err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = docs;
            ret.type = type;
            next(null, ret);
        }
    });
};

Handler.prototype.saveNewDevice = function (msg, session, next) {
    var terminalId = msg.terminalId;
    var homeId = msg.homeId;
    var layerName = msg.layerName;
    var homeGridId = msg.gridId;
    var type = msg.type;
    var brand = msg.brand;
    var name = msg.name;
    var model = msg.model;

    // 设备初始化状态添加,各种状态的调整和解读
    var status = DeviceStatusUtil.getInitStatus(type);

    var userEquipmentEntity = new UserEquipmentModel({
        e_name: name,
        terminalId: terminalId,
        home_id: homeId,
        layerName: layerName,
        homeGridId: homeGridId,
        e_type: type,
        pingpai: brand,
        typeName:model,
        status: status.power,
        ac_model: status.mode,
        ac_windspeed: status.wind,
        ac_temperature: status.temerature
    });

    userEquipmentEntity.save(function (err) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        }
        else {
            next(null, Code.OK);
        }
    });
};

Handler.prototype.deleteDevice = function (msg, session, next) {
    var deviceId = msg.deviceId;
    UserEquipmentModel.remove({_id: new Object(deviceId)}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
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
Handler.prototype.bindUserHomeWifi = function (msg, session, next) {
    var type = msg.type;
    var ssid = msg.ssid;
    var passwd = msg.passwd;
    var uid = session.uid;

    var homeWifiEntity = new HomeWifiModel({ssid: ssid, passwd: passwd, usermobile: uid});
    homeWifiEntity.save(function (err) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        }
        else {
            next(null, Code.OK);
        }
    });
};


var resolveHomeGrids = function (homeId, layerName, room, hall, toilet, kitchen) {
    for (var i = 1; i <= room; i++) {
        new HomeGridModel({
            homeId: homeId,
            layerName: layerName,
            gridType: 'room',
            dorder: i
        }).save(function (err, doc) {
        });
    }

    for (var j = 1; j <= hall; j++) {
        new HomeGridModel({
            homeId: homeId,
            layerName: layerName,
            gridType: 'hall',
            dorder: j
        }).save(function (err, doc) {
        });
    }

    for (var k = 1; k <= toilet; k++) {
        new HomeGridModel({
            homeId: homeId,
            layerName: layerName,
            gridType: 'toilet',
            dorder: k
        }).save(function (err, doc) {
        });
    }

    for (var l = 1; l <= kitchen; l++) {
        new HomeGridModel({
            homeId: homeId,
            layerName: layerName,
            gridType: 'kitchen',
            dorder: l
        }).save(function (err, doc) {
        });
    }
};

/**
 * 前台用户发出语音指令
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.userSaySomething = function (msg, session, next) {
    var self = this;
    var uid = session.uid;
    var words = msg.words;

    HomeModel.find({userMobile: uid}, function (err, docs) {
        if (err) {
            console.log(docs);
            next(null, Code.DATABASE);
        } else {
            // TODO 选择homeId, 语言模式上调整
            if (!!docs) {
                var homeId = docs[0]._id;
                var data = {
                    str: words,
                    user_id: uid,
                    home_id: '5754eb2a37c667e737df9ee3'
                };
                data = require('querystring').stringify(data);
                var host = "http://122.225.88.66:8180/SpringMongod/main/ao?" + data;
                request(host, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var result = JSON.parse(body);
                        console.log("语音解析结果:" + JSON.stringify(result));
                        var ret = Code.OK;
                        if(!! result.orderAndInfrared && result.orderAndInfrared.length > 0) {
                            // 判断房间是否相同 如果相同，则直接执行，如果不同，对用户进行询问
                            // 返回的数据结构：
                            var targetArray = new Array();
                            var sentence = "";

                            for(var i=0;i<result.orderAndInfrared.length;i++) {
                                var t = result.orderAndInfrared[i];
                                targetArray.push(SayingUtil.translateStatus(t.order.ueq));

                                var data = t.infrared.infraredcode;

                                // 开始发送红外命令
                                UserEquipmentModel.find({_id:t.order.ueq.id}, function(err, docs) {
                                    TerminalModel.find({_id:docs[0].terminalId}, function(err, docs) {
                                        var serialNo = docs[0].centerBoxSerialno;
                                        var param = {
                                            command: '3000',
                                            ipAddress: '',
                                            serialNo:serialNo,
                                            data: data
                                        };
                                        var sessionService = self.app.get('sessionService');
                                        self.app.get('channelService').pushMessageByUids('onMsg', param, [{
                                            uid: 'socketServer*otron',
                                            sid: 'connector-server-1'
                                        }]);
                                    });
                                });
                            }

                            // 判断是否延时
                            if(result.delayOrder == true) {
                                sentence = result.delayDesc + "将为您" + JSON.stringify(targetArray);
                            } else {
                                sentence = "已为您" + JSON.stringify(targetArray);
                            }
                            ret.data = sentence;
                        } else {

                            if(result.status == "turing") {
                                var msgObj = JSON.parse(result.msg);
                                ret.data = {result:msgObj.text};
                            } else {
                                ret.data = {result:result.msg};
                            }
                        }
                        next(null, ret);
                    } else {
                        next(null, Code.NET_FAIL);
                    }
                });
            } else {
                next(null, Code.DATABASE)
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
Handler.prototype.remoteControll = function (msg, session, next) {

    // 目前写死一个设备
    var user_id = session.uid;
    var deviceId = msg.deviceId;
    UserEquipmentModel.find({_id:deviceId}, function(err, docs) {
        if(err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            if(!!docs) {
                var device = docs[0];
                var deviceType = msg.deviceType;
                var status = msg.status;
                var model = msg.model;
                var ac_windspeed = msg.ac_windspeed;
                var ac_temperature = msg.ac_temperature;
                var num = msg.num;
                var chg_voice = msg.chg_voice;
                var chg_chn = msg.chg_chn;

                model = escape(escape(model));
                deviceType = escape(escape(deviceType));
                status = escape(escape(status));

                var data = {
                    user_id: user_id,
                    deviceId: deviceId,
                    deviceType: deviceType,
                    status: status,
                    model: model,
                    ac_windspeed: ac_windspeed,
                    ac_temperature: ac_temperature
                };

                data = require('querystring').stringify(data);
                // var host = "http://192.168.2.113:8080/SpringMongod/main/getorder?" + data;
                var host = "http://122.225.88.66:8180/SpringMongod/main/getorder?" + data;
                request(host, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        next(null, body);
                    }
                });
            } else {
                next(null, Code.REMOTECONTROLL.USEREQUIPMENT_NOT_EXIST);
            }
        }
    });
};

Handler.prototype.getSensorDatas = function (msg, session, next) {
    var uid = session.uid;
    var centerBoxId = msg.centerBoxId;
    // TODO 排序
    SensorDataModel.find({centerBoxId: centerBoxId}, "-_id -centerBoxId", function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        }
        else {
            var ret = Code.OK;
            ret.data = docs;
            next(null, ret);
        }
    });
};


Handler.prototype.getUserList = function (msg, session, next) {
    var self = this;
    var sessionService = this.app.get('sessionService');
    var uidMap = sessionService.service.uidMap;

    UserModel.find({}, function (err, docs) {
        if (err) console.log(err);
        else {
            var users = [];
            for (var i = 0; i < docs.length; i++) {
                var flag = false;
                for (var data in uidMap) {
                    if (docs[i].mobile === data) {
                        flag = true;
                    }
                }
                users.push({"online": flag, "user": docs[i]});
            }
            var ret = Code.OK;
            ret.data = users;
            next(null, ret);
        }
    });
};

Handler.prototype.sendNotice = function (msg, session, next) {
    var self = this;
    var userMobile = msg.userMobile;
    var userMsg = msg.userMsg;

    var param = {"command": "notice", "userMsg": userMsg};

    self.app.get('channelService').pushMessageByUids('onMsg', param, [{
        uid: userMobile,
        sid: 'user-server-1'
    }]);
};

Handler.prototype.delayNotify = function (msg, session, next) {
    var self = this;
    var uid = msg.uid;
    var content = msg.content;
    var param = {
        command: '6000',
        content: content
    };
    console.log("延时命令：" + JSON.stringify(msg));
    self.app.get('channelService').pushMessageByUids('onMsg', param, [{
        uid: uid,
        sid: 'user-server-1'
    }]);

    next(null, Code.OK);
};

Handler.prototype.tempMsgList = function (msg, session, next) {
    var json = new Array();
    json.push({title: 'title1', content: 'content1'});
    json.push({title: 'title2', content: 'content2'});
    json.push({title: 'title3', content: 'content3'});
    json.push({title: 'title4', content: 'content4'});
    json.push({title: 'title5', content: 'content5'});
    json.push({title: 'title6', content: 'content6'});
    json.push({title: 'title7', content: 'content7'});
    json.push({title: 'title8', content: 'content8'});
    json.push({title: 'title9', content: 'content9'});
    json.push({title: 'title10', content: 'content10'});
    var ret = Code.OK;
    ret.data = json;
    next(null, ret);
};

Handler.prototype.testOn = function (msg, session, next) {
    var self = this;
    var data = "00 01 11";
    var param = {
        command: '3008',
        ipAddress: '122.225.88.66',
        data: data
    };
    var sessionService = self.app.get('sessionService');
    self.app.get('channelService').pushMessageByUids('onMsg', param, [{
        uid: 'socketServer*otron',
        sid: 'connector-server-1'
    }]);
    next(null, Code.OK);
};

Handler.prototype.testOff = function (msg, session, next) {
    var self = this;
    var data = "00 01 18";
    var param = {
        command: '3008',
        ipAddress: '122.225.88.66',
        data: data
    };
    var sessionService = self.app.get('sessionService');
    self.app.get('channelService').pushMessageByUids('onMsg', param, [{
        uid: 'socketServer*otron',
        sid: 'connector-server-1'
    }]);
    next(null, Code.OK);
};
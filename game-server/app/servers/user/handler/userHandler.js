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
var NoticeModel = require('../../../mongodb/models/NoticeModel');
var Moment = require('moment');
var WeatherModel = require('../../../graber/weather/WeatherModel');

module.exports = function (app) {
    return new Handler(app);
};

var Handler = function (app) {
    this.app = app;
    this.channelService = app.get('channelService');
};

/**
 * 获取主控列表
 */
Handler.prototype.getCenterBoxList = function (msg, session, next) {
    CenterBoxModel.find({}, function (error, docs) {
        if (error) {
            console.log(error);
        } else {
            next(null, docs);
        }
    });
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
 * TODO 如果是子账户，显示主账户所有相关信息
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
                var ids = new Array();
                ids.push(uid);
                ids.push(userDoc.parentUser);

                HomeModel.find({userMobile: {$in:ids}}, function (err, homeDocs) {
                    if (err) {
                        console.log(err);
                        next(null, Code.DATABASE);
                    } else {
                        HomeWifiModel.find({usermobile: {$in:ids}}, function (err, homeWifiDocs) {
                            if (err) {
                                console.log(err);
                                next(null, Code.DATABASE);
                            } else {
                                CenterBoxModel.find({userMobile: {$in:ids}}, function (err, centerBoxDocs) {
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
 * 获取用户的家庭和楼层列表
 */
Handler.prototype.getUserHomeTitle = function (msg, session, next) {
    var uid = session.uid;
    UserModel.findOne({mobile: uid}, function (err, userDoc) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            if (!!userDoc) {
                var ids = new Array();
                ids.push(uid);
                ids.push(userDoc.parentUser);
                HomeModel.find({userMobile: {$in:ids}}, function (err, homeDocs) {
                    if (err) {
                        console.log(err);
                        next(null, Code.DATABASE);
                    } else {
                        if (!!homeDocs && homeDocs.length > 0) {
                            var homeArray = new Array();
                            for (var x = 0; x < homeDocs.length; x++) {
                                var home = homeDocs[x];
                                var h = new Object();
                                var title = home.name;
                                if (title == undefined) {
                                    title = home.floorName;
                                }
                                h.title = title;
                                h.homeId = home._id;
                                if (!!home.layers) {
                                    if (home.layers.length <= 1) {
                                        h.layerName = home.layers[0].name;
                                        homeArray.push(h);
                                    } else {
                                        for (var y = 0; y < home.layers.length; y++) {
                                            title += " " + home.layers[y].name;
                                            h.layerName = home.layers[y].name;
                                            homeArray.push(h);
                                        }
                                    }
                                }
                            }
                            var ret = Code.OK;
                            ret.data = homeArray;
                            next(null, ret);
                        }
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
    var homeId = msg.homeId;
    var layerName = msg.layerName;
    var userMobile = session.uid;

    if(!!homeId && !!layerName) {
        UserEquipmentModel.find({home_id: homeId, layerName:layerName}).populate('homeGridId').exec(function (err, docs) {
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
        UserModel.findOne({mobile:userMobile}, function(err, user) {
            if (err) {
                console.log(err);
                next(null, Code.DATABASE);
            } else {
                var ids = new Array();
                ids.push(userMobile);
                ids.push(user.parentUser);

                HomeModel.find({userMobile: {$in:ids}}, function (err, homes) {
                    if (!!homes) {
                        var homeIds = [];
                        for (var i = 0; i < homes.length; i++) {
                            homeIds.push(homes[i]._id);
                        }

                        UserEquipmentModel.find({home_id: {$in: homeIds}}).populate('homeGridId').exec(function (err, docs) {
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
            }
        });
    }
};

Handler.prototype.getDeviceList = function (msg, session, next) {
    var homeId = msg.homeId;
    var layerName = msg.layerName;
    var userMobile = session.uid;

    if(!!homeId && !!layerName) {
        UserEquipmentModel.find({home_id: homeId, layerName:layerName}).populate('homeGridId').exec(function (err, docs) {
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
        UserModel.findOne({mobile:userMobile}, function(err, user) {
            if (err) {
                console.log(err);
                next(null, Code.DATABASE);
            } else {
                var ids = new Array();
                ids.push(userMobile);
                ids.push(user.parentUser);

                HomeModel.find({userMobile: {$in:ids}}, function (err, homes) {
                    if (!!homes) {
                        var homeIds = [];
                        for (var i = 0; i < homes.length; i++) {
                            homeIds.push(homes[i]._id);
                        }

                        UserEquipmentModel.find({home_id: {$in: homeIds}}).populate('homeGridId').exec(function (err, docs) {
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
            }
        });
    }
};

Handler.prototype.getDeviceListByGridId = function (msg, session, next) {
    var homeGridId = msg.homeGridId;
    UserEquipmentModel.find({homeGridId: homeGridId}).populate('homeGridId').exec(function (err, docs) {
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


Handler.prototype.bindCenterBoxToLayer = function (msg, session, next) {
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
    var uid = session.uid;
    UserModel.findOne({mobile:uid}, function(err, user) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ids = new Array();
            ids.push(userMobile);
            ids.push(user.parentUser);

            HomeModel.find({userMobile: {$in: ids}}, function (err, docs) {
                if (err) console.log(err);
                else {
                    var ret = Code.OK;
                    ret.data = docs;
                    next(null, ret);
                }
            });
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
            if (!!grids && grids.length > 0) {
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
            } else {
                next(null, Code.NODATA);
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
                        next(null, Code.OK);
                    }
                });
                // 增加家庭信息
            } else {
                for (var i = 0; i < docs.length; i++) {
                    var home = docs[i];
                    if (home.floorId == floorId) {
                        var newLayer = {
                            name: name,
                            room: room,
                            hall: hall,
                            toilet: toilet,
                            kitchen: kitchen
                        };
                        HomeModel.update({_id: home._id}, {'$push': {layers: newLayer}}, function (error, docs) {
                            next(null, Code.OK);
                        });
                    }
                }
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
    RDeviceModel.distinct("brand", {devType: type}, function (err, docs) {
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
 * 根据设备品牌获得型号列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getDeviceModels = function (msg, session, next) {
    var brand = msg.brand;
    var type = msg.type;
    RDeviceModel.distinct("typeName", {brand: brand}, function (err, docs) {
        if (err) {
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
        typeName: model,
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
    if(!!deviceId) {
        if(deviceId.indexOf(",") > -1) {
            var idArray = deviceId.split(',');
            var ids = new Array();
            for(var i=0;i<idArray.length;i++) {
                ids.push(idArray[i]);
            }

            UserEquipmentModel.remove({_id: {$in:ids}}, function (err, docs) {
                if (err) {
                    console.log(err);
                    next(null, Code.DATABASE);
                } else {
                    next(null, Code.OK);
                }
            });
        } else {
            UserEquipmentModel.remove({_id: new Object(deviceId)}, function (err, docs) {
                if (err) {
                    console.log(err);
                    next(null, Code.DATABASE);
                } else {
                    next(null, Code.OK);
                }
            });
        }
    }
};

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
    var ipAddress = msg.ipAddress;
    var port = msg.port;
    if (words == "图片") {
        var ret = Code.OK;
        var data = new Object();
        var answer = new Array();
        answer.push("https://timgsa.baidu.com/timg?image&quality=80&size=b10000_10000&sec=1471605536296&di=31deda21579c79876b8adc8a0d0fbf10&imgtype=jpg&src=http%3A%2F%2Fpic65.nipic.com%2Ffile%2F20150503%2F7487939_220838368000_2.jpg");
        data.answer = answer;
        data.type = "pic";
        ret.data = data;
        next(null, ret);
    } else if (words == "链接") {
        var ret = Code.OK;
        var data = new Object();
        var answer = new Array();
        answer.push("<a href='http://www.baidu.com'>百度</a>");
        data.answer = answer;
        data.type = "link";
        ret.data = data;
        next(null, ret);
    } else {
        UserModel.findOne({mobile:uid}, function(err, userDocs) {
            console.log("用户列表:" + JSON.stringify(userDocs));
            if(err) {
                console.log(err);
                next(null, Code.DATABASE);
            } else {
                if(!!userDocs) {
                    var userIds = new Array();
                    userIds.push(userDocs.mobile);
                    userIds.push(userDocs.parentUser);
                    HomeModel.find({userMobile:{$in:userIds}}, function(err, docs) {
                        console.log("用户家庭请求:" + JSON.stringify(docs));
                        if (err) {
                            console.log(docs);
                            next(null, Code.DATABASE);
                        } else {
                            var user_id = userDocs._id;
                            // TODO 选择homeId, 语言模式上调整
                            if (!!docs) {
                                var homeId = docs[0]._id;
                                var data = {
                                    str: words,
                                    user_id: user_id,
                                    home_id: homeId
                                };
                                words = escape(escape(words));
                                console.log("java request begin:::" + Moment(new Date()).format('HH:mm:ss'));
                                var host = "http://122.225.88.66:8180/SpringMongod/main/ao?str=" + words + "&user_id=" + user_id + "&home_id=" + homeId;
                                request(host, function (error, response, body) {
                                    console.log("java request end  :::" + Moment(new Date()).format('HH:mm:ss'));
                                    console.log("返回JAVA端数据：：" + body);
                                    console.log("返回JAVA端错误：：" + response.statusCode);
                                    if (!error && response.statusCode == 200) {
                                        var result = JSON.parse(body);
                                        console.log("语音解析结果:" + JSON.stringify(result));
                                        var ret = Code.OK;
                                        var data = new Object();
                                        data.voiceId = result.inputstr_id;
                                        data.isDelayOrder = result.delayOrder;
                                        data.isCanLearn = result.iscanlearn;
                                        data.from = result.status;

                                        if (!!result.orderAndInfrared && result.orderAndInfrared.length > 0) {
                                            // 判断房间是否相同 如果相同，则直接执行，如果不同，对用户进行询问
                                            // 返回的数据结构：
                                            var targetArray = new Array();
                                            var devices = new Array();
                                            var sentence = "";

                                            for (var i = 0; i < result.orderAndInfrared.length; i++) {
                                                var t = result.orderAndInfrared[i];
                                                targetArray.push(SayingUtil.translateStatus(t.order.ueq));
                                                devices.push(t.order.ueq);

                                                var ircode = t.infrared.infraredcode;
                                                var terminalCode = "01";

                                                // 开始发送红外命令
                                                UserEquipmentModel.find({_id: t.order.ueq.id}, function (err, docs) {
                                                    TerminalModel.find({_id: docs[0].terminalId}, function (err, docs) {
                                                        var serialNo = docs[0].centerBoxSerialno;
                                                        CenterBoxModel.find({serialno: serialNo}, function (err, docs) {
                                                            var curPort = docs[0].curPort;
                                                            var curIpAddress = docs[0].curIpAddress;
                                                            console.log("---------------------寻找当前主控信信息---------------------");
                                                            console.log("curIpAddress : " + curIpAddress + "___curPort : " + curPort);
                                                            var param = {
                                                                command: '3000',
                                                                ipAddress: curIpAddress,
                                                                serialNo: serialNo,
                                                                data: terminalCode + " " + ircode,
                                                                port: curPort
                                                            };
                                                            var sessionService = self.app.get('sessionService');
                                                            console.log("向ots推送消息:" + JSON.stringify(param));
                                                            self.app.get('channelService').pushMessageByUids('onMsg', param, [{
                                                                uid: 'socketServer*otron',
                                                                sid: 'connector-server-1'
                                                            }]);
                                                        });
                                                    });
                                                });
                                            }
                                            // 判断是否延时
                                            if (result.delayOrder == true) {
                                                sentence = result.delayDesc + "将为您" + JSON.stringify(targetArray);
                                            } else {
                                                sentence = "已为您" + JSON.stringify(targetArray);
                                            }

                                            data.answer = sentence;
                                            data.devices = devices;
                                            data.type = "data";
                                            ret.data = data;
                                        } else {
                                            if (result.status == "turing") {
                                                var msgObj = JSON.parse(result.msg);
                                                ret.data = {result: msgObj.text, type: "data"};
                                            } else {
                                                ret.data = {result: result.msg, type: "data"};
                                            }
                                        }
                                        console.log("最终反馈给用户:" + JSON.stringify(ret));
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
                }
            }
        });
    }
};

// TODO 只对在语音界面的用户推送
Handler.prototype.enterVoice = function(msg, session, next) {
    next(null, Code.OK);
};
// TODO 只对在语音界面的用户推送
Handler.prototype.leaveVoice = function(msg, session, next) {
    next(null, Code.OK);
};

/**
 * 向用户推送
 * type可选 ['txt', 'pic', 'link', 'arch']
 * 对应 文本，图片，链接，APP内部锚点
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.pushMsg = function(msg, session, next) {
    var self = this;
    var targetMobile = msg.targetMobile;
    var type = msg.type;
    var content = msg.content;
    var pic = msg.pic;
    var link = msg.link;

    var param = {
        type:type,
        data:content,
        pic:pic,
        link:link
    };

    /**
     * 不填写，向全部用户推送
     */
    if(targetMobile == "" || targetMobile == undefined || targetMobile == "undefined") {
        UserModel.find({}, function(err, docs) {
            if(!!docs) {
                for(var i=0;i<docs.length;i++) {
                    var tm = docs[i].mobile;
                    self.app.get('channelService').pushMessageByUids('onVoice', param, [{
                        uid: tm,
                        sid: 'user-server-1'
                    }]);
                }
            }
        });
    } else {
        self.app.get('channelService').pushMessageByUids('onVoice', param, [{
            uid: targetMobile,
            sid: 'user-server-1'
        }]);
    }
};


/**
 * 用户学习
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.study = function (msg, session, next) {

    var inputstr_id = msg.lastVoiceId;
    var devicesString = msg.devices;
    var devices = JSON.parse(devicesString);
    var postString = new Object();
    postString.inputstr_id = inputstr_id;
    var orderparamlist = new Array();
    UserModel.find({mobile: session.uid}, function (err, userDocs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            for (var i = 0; i < devices.length; i++) {
                var d = new Object();
                d.ac_temperature = devices[i].ac_temperature;
                d.ac_windspeed = devices[i].ac_windspeed;
                d.deviceId = devices[i].deviceId;
                d.deviceType = devices[i].deviceType;
                d.model = devices[i].model;
                d.status = devices[i].status;
                d.user_id = userDocs[0]._id;
                orderparamlist.push(d);
            }
            postString.orderparamlist = orderparamlist;
            // 122.225.88.66:8180

            request.post('http://122.225.88.66:8180/SpringMongod/main/learnorder', {form: {learnParam: JSON.stringify(postString)}}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var result = JSON.parse(body);
                    console.log("语音解析结果:" + JSON.stringify(result));
                    var ret = Code.OK;
                    if (!!result) {
                        var data = new Object();
                        var targetArray = new Array();
                        var devices = new Array();
                        var sentence = "";
                        var delayDesc = "";

                        for (var i = 0; i < result.length; i++) {
                            data.voiceId = result[i].inputstr_id;
                            data.isDelayOrder = result[i].delayOrder;
                            data.isCanLearn = result[i].iscanlearn;
                            data.from = result[i].status;

                            delayDesc = result[i].delayDesc;

                            var t = result[i].orderAndInfrared;
                            targetArray.push(SayingUtil.translateStatus(t[0].order.c_ac));
                            devices.push(t[0].order.c_ac);
                        }

                        // 判断是否延时
                        if (data.isDelayOrder == true) {
                            sentence = delayDesc + "将为您" + JSON.stringify(targetArray);
                        } else {
                            sentence = "已为您" + JSON.stringify(targetArray);
                        }
                        data.answer = sentence;
                        data.devices = devices;
                        ret.data = data;
                        next(null, ret);
                    }
                }
            });
        }
    });
};

/**
 * 根据用户某句话得到设备列表
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getDeviceListByVoiceId = function (msg, session, next) {
    var deviceIds = msg.deviceIds;
    var array = deviceIds.split(",");
    UserEquipmentModel.find({_id: {$in: array}}, function (err, docs) {
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
 * 用户发出遥控指令
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.remoteControll = function (msg, session, next) {

    // 目前写死一个设备
    var user_id = session.uid;
    var deviceId = msg.deviceId;
    UserEquipmentModel.find({_id: deviceId}, function (err, docs) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            if (!!docs) {
                var device = docs[0];
                var deviceType = msg.deviceType == undefined ? '' : msg.deviceType;
                var status = msg.status == undefined ? '' : msg.status;
                var model = msg.model == undefined ? '' : msg.model;
                var ac_windspeed = msg.ac_windspeed == undefined ? '' : msg.ac_windspeed;
                var ac_temperature = msg.ac_temperature == undefined ? '' : msg.ac_temperature;
                var num = msg.num == undefined ? '' : msg.num;
                var chg_voice = msg.chg_voice == undefined ? '' : msg.chg_voice;
                var chg_chn = msg.chg_chn == undefined ? '' : msg.chg_chn;
                var inst = msg.inst == undefined ? '' : msg.inst;

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
                    ac_temperature: ac_temperature,
                    chg_chn: chg_chn,
                    chg_voice: chg_voice,
                    inst: inst
                };

                data = require('querystring').stringify(data);
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

Handler.prototype.setCenterBoxSwitch = function (msg, session, next) {
    console.log("开关设置:::" + JSON.stringify(msg));
    if (msg.type == "temperature") {
        CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"temperatureSwitch": msg.btn}}, function (error, docs) {
            console.log("xxxxxxx1" + JSON.stringify(docs));
            next(null, Code.OK);
        });
    } else if (msg.type == "humidity") {
        CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"humiditySwitch": msg.btn}}, function (error, docs) {
            console.log("xxxxxxx2" + JSON.stringify(docs));
            next(null, Code.OK);
        });
    } else if (msg.type == "co") {
        CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"coSwitch": msg.btn}}, function (error, docs) {
            console.log("xxxxxxx3" + JSON.stringify(docs));
            next(null, Code.OK);
        });
    } else if (msg.type == "quality") {
        CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"qualitySwitch": msg.btn}}, function (error, docs) {
            console.log("xxxxxxx4" + JSON.stringify(docs));
            next(null, Code.OK);
        });
    } else if (msg.type == "pm25") {
        CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"pm25Switch": msg.btn}}, function (error, docs) {
            console.log("xxxxxxx5" + JSON.stringify(docs));
            next(null, Code.OK);
        });
    }
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

Handler.prototype.monitorhooker = function (msg, session, next) {
    next(null, Code.OK);
};

/**
 消息列表
 **/
Handler.prototype.getNoticeList = function (msg, session, next) {
    var page = msg.page;
    if (page == undefined || page < 1) {
        page = 1;
    }
    var pageSize = msg.pageSize;
    if (pageSize == undefined || pageSize < 1) {
        pageSize = 10;
    }
    var userMobile = session.uid;

    var skip = pageSize * (page - 1);
    NoticeModel.find({userMobile: userMobile}).select('userMobile addTime hasRead title content noticeType summary')
        .sort({hasRead: 1, addTime: -1}).skip(skip).limit(pageSize).exec(function (err, notices) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var news = new Array();
            var today = new Date();
            var yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            for (var i = 0; i < notices.length; i++) {
                var n = new Object();
                var addTime = notices[i].addTime;
                if (addTime.getFullYear() == today.getFullYear() && addTime.getMonth() == today.getMonth() && addTime.getDate() == today.getDate()) {
                    n.addTime = Moment(notices[i].addTime).format('HH:mm');
                } else {
                    if (addTime.getFullYear() == yesterday.getFullYear() && addTime.getMonth() == yesterday.getMonth() && addTime.getDate() == yesterday.getDate()) {
                        n.addTime = "昨天";
                    } else {
                        n.addTime = Moment(notices[i].addTime).format('MM-DD HH:mm');
                    }
                }
                n._id = notices[i]._id;
                n.title = notices[i].title;
                n.content = notices[i].content;
                n.contentTrim = StringUtil.filterHtml(notices[i].content);
                n.summary = notices[i].summary;
                n.userMobile = notices[i].userMobile;
                n.noticeType = notices[i].noticeType;
                n.hasRead = notices[i].hasRead;
                news.push(n);
            }
            var ret = Code.OK;
            ret.data = news;
            next(null, ret);
        }
    });
};

/**
 消息详情
 **/
Handler.prototype.getNoticeDetail = function (msg, session, next) {
    var id = msg.noticeId;
    NoticeModel.findOne({_id: id}, function (err, notice) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            // 设置为已读
            NoticeModel.update({_id: id}, {$set: {hasRead: 1}}, function (err, docs) {
                if (err) console.log(err);
                else
                    next(null, Code.OK);
            });
            var ret = Code.OK;

            var n = new Object();
            n._id = notice._id;
            n.title = notice.title;
            n.content = notice.content;
            n.contentTrim = StringUtil.filterHtml(notice.content);
            n.summary = notice.summary;
            n.userMobile = notice.userMobile;
            n.noticeType = notice.noticeType;
            n.hasRead = notice.hasRead;

            var today = new Date();
            var yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            var addTime = notice.addTime;
            if (addTime.getFullYear() == today.getFullYear() && addTime.getMonth() == today.getMonth() && addTime.getDate() == today.getDate()) {
                n.addTime = Moment(notice.addTime).format('HH:mm');
            } else {
                if (addTime.getFullYear() == yesterday.getFullYear() && addTime.getMonth() == yesterday.getMonth() && addTime.getDate() == yesterday.getDate()) {
                    n.addTime = "昨天";
                } else {
                    n.addTime = Moment(notice.addTime).format('MM-DD HH:mm');
                }
            }
            ret.data = n;
            next(null, ret);
        }
    });
};

/**
 * 删除消息
 */
Handler.prototype.deleteNotice = function (msg, session, next) {
    if(!!msg.noticeId) {
        var idArray = msg.noticeId.split(',');
        var ids = new Array();
        for(var i=0;i<idArray.length;i++) {
            ids.push(idArray[i]);
        }

        NoticeModel.remove({_id: {$in:ids}}, function(err, docs) {
            if (err) console.log(err);
            else
                next(null, Code.OK);
        });
    }
};

/**
 设置消息为已读
 **/
Handler.prototype.setNoticeRead = function (msg, session, next) {
    if(!!msg.noticeId) {
        var idArray = msg.noticeId.split(',');
        var ids = new Array();
        for(var i=0;i<idArray.length;i++) {
            ids.push(idArray[i]);
        }

        NoticeModel.update({_id: {$in:ids}}, {$set: {hasRead: 1}}, function (err, docs) {
            if (err) console.log(err);
            else
                next(null, Code.OK);
        });
    }
};

Handler.prototype.getNoticeNotReadCount = function (msg, session, next) {
    var userMobile = session.uid;
    NoticeModel.count({hasRead: 0, userMobile: userMobile}, function (err, count) {
        if (err) console.log(err);
        else {
            var ret = Code.OK;
            ret.data = count;
            next(null, ret);
        }
    });
};

/**
 * 获取子帐号
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getSubUserList = function (msg, session, next) {
    var parentUser = session.uid;
    UserModel.find({parentUser: parentUser}, function (err, subUsers) {
        if (err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            var ret = Code.OK;
            ret.data = subUsers;
            next(null, ret);
        }
    });
};

/**
 设置子账户
 */
Handler.prototype.setSubUser = function(msg, session, next) {
    var targetMobile = msg.targetMobile;
    var selfMobile = session.uid;
    UserModel.update({mobile:targetMobile}, {$set:{parentUser:selfMobile}}, function(err, docs) {
        if(err) {
            console.log(err);
            next(null, Code.DATABASE);
        } else {
            next(null, Code.OK);
        }
    });
};
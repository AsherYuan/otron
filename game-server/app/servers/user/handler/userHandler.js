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
var WeatherModel = require('../../../mongodb/grabmodel/WeatherModel');
var TSensorDataModel = require('../../../mongodb/models/TSensorDataModel');

var AccountModel = require('../../../mongodb/estateModels/accountModel');
var ComplaintModel = require('../../../mongodb/estateModels/complaintModel');
var CourierModel = require('../../../mongodb/estateModels/courierModel');
var HouseKeepingModel = require('../../../mongodb/estateModels/housekeepingModel');
var PayModel = require('../../../mongodb/estateModels/payModel');
var RepairModel = require('../../../mongodb/estateModels/repairModel');
var UserWordsTest = require('../../../util/UserWordsTest');
var ResponseUtil = require("../../../util/ResponseUtil");

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
			next(null, ResponseUtil.resp(Code.OK, docs));
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
				next(null, ResponseUtil.resp(Code.OK));
			} else {
				next(null, ResponseUtil.resp(Code.DATABASE));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			if (!!userDoc) {
				var ids = new Array();
				ids.push(uid);
				if (!!userDoc.parentUser) {
					ids.push(userDoc.parentUser);
				}

				HomeModel.find({userMobile: {$in: ids}}, function (err, homeDocs) {
					if (err) {
						console.log(err);
						next(null, ResponseUtil.resp(Code.DATABASE));
					} else {
						HomeWifiModel.find({usermobile: {$in: ids}}, function (err, homeWifiDocs) {
							if (err) {
								console.log(err);
								next(null, ResponseUtil.resp(Code.DATABASE));
							} else {
								CenterBoxModel.find({userMobile: {$in: ids}}, function (err, centerBoxDocs) {
									if (err) {
										console.log(err);
										next(null, ResponseUtil.resp(Code.DATABASE));
									} else {
										userDoc.homeInfo = homeDocs;
										userDoc.centerBox = centerBoxDocs;
										userDoc.homeWifi = homeWifiDocs;
										next(null, ResponseUtil.resp(Code.OK, userDoc));
									}
								});
							}
						});
					}
				});
			} else {
				next(null, ResponseUtil.resp(Code.ACCOUNT.USER_NOT_EXIST));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			if (!!userDoc) {
				var ids = new Array();
				ids.push(uid);
				if (!!userDoc.parentUser) {
					ids.push(userDoc.parentUser);
				}
				HomeModel.find({userMobile: {$in: ids}}, function (err, homeDocs) {
					if (err) {
						console.log(err);
						next(null, ResponseUtil.resp(Code.DATABASE));
					} else {
						if (!!homeDocs && homeDocs.length > 0) {
							var homeArray = new Array();
							for (var x = 0; x < homeDocs.length; x++) {
								var home = homeDocs[x];
								var newArray = getHomeTitle(home);
								for (var z = 0; z < newArray.length; z++) {
									homeArray.push(newArray[z]);
								}
							}
							next(null, ResponseUtil.resp(Code.OK, homeArray));
						}
					}
				});
			} else {
				next(null, ResponseUtil.resp(Code.ACCOUNT.USER_NOT_EXIST));
			}
		}
	});
};

var getHomeTitle = function (home) {
	var homeArray = new Array();
	if (!!home.layers) {
		if (home.layers.length <= 1) {
			var h = new Object();
			h.homeId = home._id;
			h.originTitle = home.name;
			if (h.originTitle == undefined) {
				h.originTitle = home.floorName;
			}
			h.title = h.originTitle;
			h.layerName = home.layers[0].name;
			homeArray.push(h);
		} else {
			for (var y = 0; y < home.layers.length; y++) {
				var h = new Object();
				h.homeId = home._id;
				h.originTitle = home.name;
				if (h.originTitle == undefined) {
					h.originTitle = home.floorName;
				}
				h.title = renderLayersTitle(h.originTitle, home.layers[y]);
				h.layerName = home.layers[y].name;
				homeArray.push(h);
			}
		}
	}
	return homeArray;
};

var renderLayersTitle = function (title, layer) {
	title += " " + layer.name;
	return title;
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
			next(null, ResponseUtil.resp(Code.OK, docs));
		});
	} else {
		TerminalModel.find(params, function (err, docs) {
			next(null, ResponseUtil.resp(Code.OK, docs));
		});
	}
};

Handler.prototype.queryDevices = function (msg, session, next) {
	var homeId = msg.homeId;
	var layerName = msg.layerName;
	var userMobile = session.uid;
	if (!!homeId && !!layerName) {
		UserEquipmentModel.find({
			home_id: homeId,
			layerName: layerName
		}).populate('homeGridId').exec(function (err, docs) {
			if (err) {
				console.log(err);
				next(null, ResponseUtil.resp(Code.DATABASE));
			} else {
				next(null, ResponseUtil.resp(Code.OK, docs));
			}
		});
	} else {
		UserModel.findOne({mobile: userMobile}, function (err, user) {
			if (err) {
				console.log(err);
				next(null, ResponseUtil.resp(Code.DATABASE));
			} else {
				var ids = new Array();
				ids.push(userMobile);
				if (!!user.parentUser) {
					ids.push(user.parentUser);
				}
				HomeModel.find({userMobile: {$in: ids}}, function (err, homes) {
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
								next(null, ResponseUtil.resp(Code.OK, docs));
							}
						});
					} else {
						next(null, ResponseUtil.resp(Code.DATABASE));
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

	if (!!homeId && !!layerName) {
		UserEquipmentModel.find({
			home_id: homeId,
			layerName: layerName
		}).populate('homeGridId').exec(function (err, docs) {
			if (err) {
				console.log(err);
				next(null, ResponseUtil.resp(Code.DATABASE));
			} else {
				next(null, ResponseUtil.resp(Code.OK, docs));
			}
		});
	} else {
		UserModel.findOne({mobile: userMobile}, function (err, user) {
			if (err) {
				console.log(err);
				next(null, ResponseUtil.resp(Code.DATABASE));
			} else {
				var ids = new Array();
				ids.push(userMobile);
				if (!!user.parentUser) {
					ids.push(user.parentUser);
				}

				HomeModel.find({userMobile: {$in: ids}}, function (err, homes) {
					if (!!homes) {
						var homeIds = [];
						for (var i = 0; i < homes.length; i++) {
							homeIds.push(homes[i]._id);
						}

						UserEquipmentModel.find({home_id: {$in: homeIds}}).populate('homeGridId').exec(function (err, docs) {
							if (err) {
								console.log(err);
								next(null, ResponseUtil.resp(Code.DATABASE));
							} else {
								next(null, ResponseUtil.resp(Code.OK, docs));
							}
						});
					} else {
						next(null, ResponseUtil.resp(Code.DATABASE));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK));
		}
	});
}

Handler.prototype.bindTerminalToHomeGrid = function (msg, session, next) {
	var homeGridId = msg.homeGridId;
	var terminalId = msg.terminalId;

	HomeGridModel.update({_id: homeGridId}, {
		$set: {
			"terminalId": terminalId,
			"terminal": terminalId
		}
	}, function (err, docs) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			TerminalModel.update({_id: terminalId}, {$set: {"homeGridId": homeGridId}}, function (err, docs) {
				if (err) {
					console.log(err);
					next(null, ResponseUtil.resp(Code.DATABASE));
				} else {
					next(null, ResponseUtil.resp(Code.OK));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK));
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
	var centerBoxSerialno = msg.centerBoxSerialno;
	var entity = new TerminalModel({userMobile: uid, ssid: ssid, passwd: passwd, centerBoxSerialno: centerBoxSerialno});
	entity.save(function (err) {
		if (err) console.log(err);
		else {
			next(null, ResponseUtil.resp(Code.OK));
		}
	});
}

/**
 获取用户的家庭信息
 */
Handler.prototype.getHomeInfo = function (msg, session, next) {
	var uid = session.uid;
	UserModel.findOne({mobile: uid}, function (err, user) {
		if (err) {
			console.log(err);
			next(null, Code.DATABASE);
		} else {
			var ids = new Array();
			ids.push(userMobile);
			if (!!user.parentUser) {
				ids.push(user.parentUser);
			}

			HomeModel.find({userMobile: {$in: ids}}, function (err, docs) {
				if (err) console.log(err);
				else {
					next(null, ResponseUtil.resp(Code.OK, docs));
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
	HomeGridModel.find({homeId: homeId, layerName: layerName}).populate('terminal').exec(function (err, grids) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, {code:200, codetxt:'操作成功1', data:grids, centerBoxSerialno:centerBoxSerialno,  homeId:homeId, layerName:layerName});
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, doc));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
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
						next(null, ResponseUtil.resp(Code.OK));
					}
				});
				// 增加家庭信息
			} else {
				var floorExist = false;
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
						floorExist = true;
						HomeModel.update({_id: home._id}, {'$push': {layers: newLayer}}, function (error, docs) {
							resolveHomeGrids(docs._id, name, room, hall, toilet, kitchen);
							next(null, ResponseUtil.resp(Code.OK));
						});
					}
				}

				if (floorExist == false) {
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
							next(null, ResponseUtil.resp(Code.OK));
						}
					});
				}
			}
			next(null, ResponseUtil.resp(Code.OK, docs));
		}
	});
};

/**
 * 获取设备类型列表
 */
Handler.prototype.getDeviceTypes = function (msg, session, next) {
	var types = [{name: '空调'}, {name: '电视'}, {name: '电灯'}, {name: '窗帘'}]
	next(null, ResponseUtil.resp(Code.OK, types));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, {code:200, codetxt:'操作成功', data:docs, type:type});
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
		ac_temperature: status.temerature,
		tv_ismute: status.tv_ismute
	});

	userEquipmentEntity.save(function (err) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		}
		else {
			next(null, ResponseUtil.resp(Code.OK));
		}
	});
};

Handler.prototype.deleteDevice = function (msg, session, next) {
	var deviceId = msg.deviceId;
	if (!!deviceId) {
		if (deviceId.indexOf(",") > -1) {
			var idArray = deviceId.split(',');
			var ids = new Array();
			for (var i = 0; i < idArray.length; i++) {
				ids.push(idArray[i]);
			}

			UserEquipmentModel.remove({_id: {$in: ids}}, function (err, docs) {
				if (err) {
					console.log(err);
					next(null, ResponseUtil.resp(Code.DATABASE));
				} else {
					next(null, ResponseUtil.resp(Code.OK));
				}
			});
		} else {
			UserEquipmentModel.remove({_id: new Object(deviceId)}, function (err, docs) {
				if (err) {
					console.log(err);
					next(null, ResponseUtil.resp(Code.DATABASE));
				} else {
					next(null, ResponseUtil.resp(Code.OK));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		}
		else {
			next(null, ResponseUtil.resp(Code.OK));
		}
	});
};


var resolveHomeGrids = function (homeId, layerName, room, hall, toilet, kitchen) {
	for (var i = 1; i <= room; i++) {
		var name = "房间";
		if (room > 1) {
			name += i;
		}
		new HomeGridModel({
			homeId: homeId,
			layerName: layerName,
			gridType: 'room',
			dorder: i,
			name: name
		}).save(function (err, doc) {
		});
	}

	for (var j = 1; j <= hall; j++) {
		var name = "客厅";
		if (hall > 1) {
			name += j;
		}
		new HomeGridModel({
			homeId: homeId,
			layerName: layerName,
			gridType: 'hall',
			dorder: j,
			name: name
		}).save(function (err, doc) {
		});
	}

	for (var k = 1; k <= toilet; k++) {
		var name = "卫生间";
		if (toilet > 1) {
			name += k;
		}
		new HomeGridModel({
			homeId: homeId,
			layerName: layerName,
			gridType: 'toilet',
			dorder: k,
			name: name
		}).save(function (err, doc) {
		});
	}

	for (var l = 1; l <= kitchen; l++) {
		var name = "厨房";
		if (kitchen > 1) {
			name += l;
		}
		new HomeGridModel({
			homeId: homeId,
			layerName: layerName,
			gridType: 'kitchen',
			dorder: l,
			name: name
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

	/* 临时的回答 */
	var fixedAnswer = UserWordsTest.answer(words);
	if (!!fixedAnswer) {
		var data = new Object();
		var answer = new Array();
		answer.push(fixedAnswer);
		data.type = 'data';
		data.answer = answer;
		next(null, ResponseUtil.resp(Code.OK, data));
	} else {
		if (words == "图片") {
			var data = new Object();
			var answer = new Array();
			answer.push("https://timgsa.baidu.com/timg?image&quality=80&size=b10000_10000&sec=1471605536296&di=31deda21579c79876b8adc8a0d0fbf10&imgtype=jpg&src=http%3A%2F%2Fpic65.nipic.com%2Ffile%2F20150503%2F7487939_220838368000_2.jpg");
			data.answer = answer;
			data.type = "pic";
			next(null, ResponseUtil.resp(Code.OK, data));
		} else if (words == "链接") {
			var data = new Object();
			var answer = new Array();
			answer.push("<a href='http://www.baidu.com'>百度</a>");
			data.answer = answer;
			data.type = "link";
			next(null, ResponseUtil.resp(Code.OK, data));
		} else {
			UserModel.findOne({mobile: uid}, function (err, userDocs) {
				if (err) {
					console.log(err);
					next(null, ResponseUtil.resp(Code.DATABASE));
				} else {
					if (!!userDocs) {
						var userIds = new Array();
						userIds.push(userDocs.mobile);
						userIds.push(userDocs.parentUser);
						HomeModel.find({userMobile: {$in: userIds}}, function (err, docs) {
							if (err) {
								console.log(docs);
								next(null, ResponseUtil.resp(Code.DATABASE));
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
										if (!error && response.statusCode == 200) {
											var javaResult = JSON.parse(body);
											if (!!javaResult && javaResult.code == 200) {
												var result = JSON.parse(javaResult.data);
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
														targetArray.push(SayingUtil.translateStatus(t.order));
														devices.push(t.order.ueq);

														if (!!t.infrared && !!t.infrared.infraredcode) {
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

															deviceStatusPush(self);
														} else {
															console.log("没有红外码");
														}
													}

													console.log(JSON.stringify(targetArray));
													// 判断是否延时
													if (result.delayOrder == true) {
														sentence = result.delayDesc + "将为您" + JSON.stringify(targetArray);
													} else {
														sentence = "已为您" + JSON.stringify(targetArray);
													}

													// data.javaResult = javaResult;
													data.answer = sentence;
													data.devices = devices;
													data.type = "data";

													next(null, ResponseUtil.resp(Code.OK, data));
												} else {
													if (result.status == "turing") {
														var msgObj = JSON.parse(result.msg);
														next(null, ResponseUtil.resp(Code.OK, {result: msgObj.text, type: "data"}));
													} else {
														next(null, ResponseUtil.resp(Code.OK, {result: result.msg, type: "data"}));
													}
												}
											} else {
												console.log("错误：：：" + JSON.stringify(javaResult));
											}
										} else {
											next(null, ResponseUtil.resp(Code.NET_FAIL));
										}
									});
								} else {
									next(null, ResponseUtil.resp(Code.DATABASE));
								}
							}
						});
					}
				}
			});
		}
	}
};

// TODO 只对在语音界面的用户推送
Handler.prototype.enterVoice = function (msg, session, next) {
	next(null, ResponseUtil.resp(Code.OK));
};
// TODO 只对在语音界面的用户推送
Handler.prototype.leaveVoice = function (msg, session, next) {
	next(null, ResponseUtil.resp(Code.OK));
};

/**
 * 向用户推送
 * type可选 ['txt', 'pic', 'link', 'arch']
 * 对应 文本，图片，链接，APP内部锚点
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.pushMsg = function (msg, session, next) {
	var self = this;
	var targetMobile = msg.targetMobile;
	var type = msg.type;
	var content = msg.content;
	var pic = msg.pic;
	var link = msg.link;

	var param = {
		type: type,
		data: content,
		pic: pic,
		link: link
	};

	/**
	 * 不填写，向全部用户推送
	 */
	if (targetMobile == "" || targetMobile == undefined || targetMobile == "undefined") {
		UserModel.find({}, function (err, docs) {
			if (!!docs) {
				for (var i = 0; i < docs.length; i++) {
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
 * 向用户推送
 * type可选 ['txt', 'pic', 'link', 'arch']
 * 对应 文本，图片，链接，APP内部锚点
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.managePush = function (msg, session, next) {
	var self = this;
	var targetMobile = msg.targetMobile;
	var title = msg.title;
	var content = msg.content;

	/**
	 * 不填写，向全部用户推送
	 */
	if (targetMobile == "" || targetMobile == undefined || targetMobile == "undefined") {
		UserModel.find({}, function (err, docs) {
			if (!!docs) {
				for (var i = 0; i < docs.length; i++) {
					managePushProcess(docs[i].mobile, title, content, self);
				}
			}
		});
	} else {
		managePushProcess(targetMobile, title, content, self);
	}
};

var managePushProcess = function (mobile, title, content, self) {
	NoticeModel.count({hasRead: 0, userMobile: mobile}, function (err, count) {
		var param = {
			command: '9009',
			title: title,
			content: content,
			addTime: new Date(),
			addTimeLabel: Moment(new Date()).format('HH:mm'),
			notReadCount: count
		};
		self.app.get('channelService').pushMessageByUids('onMsg', param, [{
			uid: mobile,
			sid: 'user-server-1'
		}]);
	});
}


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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			for (var i = 0; i < devices.length; i++) {
				var d = new Object();
				d.ac_temperature = devices[i].ac_temperature;
				d.ac_windspeed = devices[i].ac_windspeed;
				d.deviceId = devices[i].id || devices[i]._id;
				d.deviceType = devices[i].e_type;
				d.model = devices[i].ac_model;
				d.status = devices[i].status;
				d.user_id = userDocs[0]._id;
				orderparamlist.push(d);
			}
			postString.orderparamlist = orderparamlist;
			request.post('http://122.225.88.66:8180/SpringMongod/main/learnorder', {form: {learnParam: JSON.stringify(postString)}}, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var javaResult = JSON.parse(body);
					if (!!javaResult && javaResult.code == 200) {
						var result = JSON.parse(javaResult.data);
						if (!!result) {
							if (result[0].msg == "没有对应的虚拟命令") {
								next(null, ResponseUtil.resp(Code.FAIL));
							} else {
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
									targetArray.push(SayingUtil.translateStatus(t[0].order));
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
								next(null, ResponseUtil.resp(Code.OK, data));
							}

						}
					} else {
						console.log("报错：：：" + JSON.stringify(javaResult));
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
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
	var self = this;
	// 目前写死一个设备
	var user_id = session.uid;
	var deviceId = msg.deviceId;
	var terminalId = msg.terminalId;
	UserEquipmentModel.find({_id: deviceId}, function (err, docs) {
		console.log("得到结果:" + JSON.stringify(docs));
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
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
				var begin = new Date().getTime();
				var host = "http://122.225.88.66:8180/SpringMongod/main/getorder?" + data;
				request(host, function (error, response, body) {
					if (!error && response.statusCode == 200) {
						var javaResult = JSON.parse(body);
						if (!!javaResult && javaResult.code == 200) {
							var result = JSON.parse(javaResult.data);
							var data = new Object();
							var targetArray = new Array();
							var devices = new Array();
							var sentence = "";
							var delayDesc = "";

							if (!!result.orderAndInfrared && result.orderAndInfrared.length > 0) {
								var targetArray = new Array();
								var devices = new Array();
								var sentence = "";

								for (var i = 0; i < result.orderAndInfrared.length; i++) {
									var t = result.orderAndInfrared[i];
									targetArray.push(SayingUtil.translateStatus(t.order));
									devices.push(t.order.ueq);
									if (!!t.infrared && !!t.infrared.infraredcode) {
										var ircode = t.infrared.infraredcode;

										TerminalModel.findById(terminalId, function (err, docs) {
											if (err) {
												console.log(err);
												next(null, Code.DATABASE);
											} else {
												var terminalCode = docs.code;
												if (!!terminalCode) {

												} else {
													terminalCode = "01";
												}
												// 开始发送红外命令
												UserEquipmentModel.find({_id: t.order.ueq.id}, function (err, docs) {
													TerminalModel.find({_id: docs[0].terminalId}, function (err, docs) {
														var serialNo = docs[0].centerBoxSerialno;
														CenterBoxModel.find({serialno: serialNo}, function (err, docs) {
															var curPort = docs[0].curPort;
															var curIpAddress = docs[0].curIpAddress;
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

												// TODO 在这里是否合适
												deviceStatusPush(self);
											}
										});
									} else {
										console.log("没有红外码");
									}
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
								next(null, ResponseUtil.resp(Code.OK, data));
							} else {
								if (result.status == "turing") {
									var msgObj = JSON.parse(result.msg);
									next(null, ResponseUtil.resp(Code.OK, {result: msgObj.text, type: "data"}));
								} else {
									next(null, ResponseUtil.resp(Code.OK, {result: result.msg, type: "data"}));
								}
							}
						}
					}
				});
			} else {
				next(null, ResponseUtil.resp(Code.REMOTECONTROLL.USEREQUIPMENT_NOT_EXIST));
			}
		}
	});
};

var deviceStatusPush = function (self) {
	UserModel.find({}, function (err, users) {
		if (err) {
			console.log(err);
		} else {
			for (var i = 0; i < users.length; i++) {
				var ids = new Array();
				ids.push(users[i].mobile);
				ids.push(users[i].parentUser);

				sendNotice(users[i].mobile, ids, self);
			}
		}
	});
};

var sendNotice = function (userMobile, ids, self) {
	console.log("强制推送..............." + userMobile);
	CenterBoxModel.find({userMobile: {$in: ids}}, function (err, centerBoxs) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			var ids = new Array();
			for (var i = 0; i < centerBoxs.length; i++) {
				ids.push(centerBoxs[i].serialno);
			}

			TerminalModel.find({centerBoxSerialno: {$in: ids}}, function (err, terminals) {
				if (err) {
					console.log(err);
				} else {
					var tIds = new Array();
					for (var j = 0; j < terminals.length; j++) {
						tIds.push(terminals[j]._id);
					}

					UserEquipmentModel.find({terminalId: {$in: tIds}}).populate({
						path: 'homeGridId',
						model: 'homeGrid',
						populate: {
							path: 'terminal',
							model: 'terminal'
						}
					}).exec(function (err, devices) {
						if (err) {
							console.log(err);
						} else {
							var ds = new Array();
							for (var k = 0; k < devices.length; k++) {
								ds.push(devices[k]);
							}

							var param = {
								command: '6000',
								devices: ds
							};
							self.app.get('channelService').pushMessageByUids('onMsg', param, [{
								uid: userMobile,
								sid: 'user-server-1'
							}]);
						}
					});
				}
			});
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		}
		else {
			next(null, ResponseUtil.resp(Code.OK, docs));
		}
	});
};

Handler.prototype.getLastSensorDatas = function (msg, session, next) {
	var uid = session.uid;
	var layerName = msg.layerName;
	var homeId = msg.homeId;
	HomeModel.findOne({_id: homeId}, function (err, home) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			var layers = home.layers;
			if (!!layers && layers.length > 0) {
				for (var i = 0; i < layers.length; i++) {
					if (layers[i].name == layerName) {
						var serialno = layers[i].centerBoxSerialno;
						if (!!serialno) {
							CenterBoxModel.findOne({serialno: serialno}, function (err, cbox) {
								if (err) {
									console.log(err);
									next(null, ResponseUtil.resp(Code.DATABASE));
								} else {
									var centerBoxId = cbox._id;
									SensorDataModel.findOne({centerBoxId: centerBoxId}).select('-_id -centerBoxId').sort({addTime: -1}).exec(function (err, data) {
										if (err) {
											console.log(err);
											next(null, ResponseUtil.resp(Code.DATABASE));
										} else {
											next(null, ResponseUtil.resp(Code.OK, data));
										}
									});
								}
							});
						}
					}
				}
			}
		}
	});
};

Handler.prototype.getLastOutDoorSensorDatas = function (msg, session, next) {
	WeatherModel.findOne().sort({time: -1}).exec(function (err, data) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, data));
		}
	});
};

Handler.prototype.setCenterBoxSwitch = function (msg, session, next) {
	console.log("开关设置:::" + JSON.stringify(msg));
	if (msg.type == "temperature") {
		CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"temperatureSwitch": msg.btn}}, function (error, docs) {
			next(null, ResponseUtil.resp(Code.OK));
		});
	} else if (msg.type == "humidity") {
		CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"humiditySwitch": msg.btn}}, function (error, docs) {
			next(null, ResponseUtil.resp(Code.OK));
		});
	} else if (msg.type == "co") {
		CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"coSwitch": msg.btn}}, function (error, docs) {
			next(null, ResponseUtil.resp(Code.OK));
		});
	} else if (msg.type == "quality") {
		CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"qualitySwitch": msg.btn}}, function (error, docs) {
			next(null, ResponseUtil.resp(Code.OK));
		});
	} else if (msg.type == "pm25") {
		CenterBoxModel.update({"serialno": msg.serialno}, {$set: {"pm25Switch": msg.btn}}, function (error, docs) {
			next(null, ResponseUtil.resp(Code.OK));
		});
	}
};


Handler.prototype.getUserList = function (msg, session, next) {
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
			console.log("用户列表:" + JSON.stringify(docs));
			next(null, ResponseUtil.resp(Code.OK, users));
		}
	});
};

Handler.prototype.confirmMsg = function (msg, session, next) {
	next(null, ResponseUtil.resp(Code.OK));
}

Handler.prototype.sendAll = function (msg, session, next) {
	var self = this;
	var userMobile = msg.userMobile;

	var p1 = {
		command: '7004',
		level: 4,
		needEcho: false,
		title: "普通消息",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "airConditioningControl",
		route: ""
	};
	self.app.get('channelService').pushMessageByUids('onMsg', p1, [{uid: userMobile, sid: 'user-server-1'}]);

	var p2 = {
		command: '7002',
		level: 3,
		needEcho: false,
		title: "您有新的快递",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "airConditioningControl",
		route: ""
	};
	self.app.get('channelService').pushMessageByUids('onMsg', p2, [{uid: userMobile, sid: 'user-server-1'}]);

	var p3 = {
		command: '7002',
		level: 3,
		needEcho: false,
		title: "您有新的快递",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "airConditioningControl",
		route: ""
	};
	self.app.get('channelService').pushMessageByUids('onMsg', p1, [{uid: userMobile, sid: 'user-server-1'}]);
	var p4 = {
		command: '7001',
		level: 2,
		needEcho: true,
		title: "检测到您室内温度过高，是否为您打开空调?",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "remoteControll",
		route: "user.userHandler.remoteControll"
	};
	self.app.get('channelService').pushMessageByUids('onMsg', p1, [{uid: userMobile, sid: 'user-server-1'}]);
	var p5 = {
		command: '7003',
		level: 1,
		needEcho: true,
		title: "煤气中毒报警",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "airConditioningControl",
		route: "user.userHandler.confirmCoAlarm"
	};
	self.app.get('channelService').pushMessageByUids('onMsg', p1, [{uid: userMobile, sid: 'user-server-1'}]);
};

Handler.prototype.sendNotice = function (msg, session, next) {
	var self = this;
	var userMobile = msg.userMobile;
	var userMsg = msg.userMsg;

	var param = {
		command: '7002',
		level: 3,
		needEcho: false,
		title: "您有新的快递",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "airConditioningControl",
		route: ""
	};

	if (msg.userMsg == "1") {
		param = {
			command: '7002',
			level: 3,
			needEcho: false,
			title: "您有新的快递",
			content: "测试",
			actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
			type: "airConditioningControl",
			route: ""
		};
	} else if (msg.userMsg == "2") {
		param = {
			command: '7001',
			level: 2,
			needEcho: true,
			title: "检测到您室内温度过高，是否为您打开空调?",
			content: "测试",
			actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
			type: "remoteControll",
			route: "user.userHandler.remoteControll"
		};
	} else if (msg.userMsg == "1") {
		param = {
			command: '7003',
			level: 1,
			needEcho: true,
			title: "煤气中毒报警",
			content: "测试",
			actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
			type: "airConditioningControl",
			route: "user.userHandler.confirmCoAlarm"
		};
	} else if (msg.userMsg == "4") {
		param = {
			command: '7004',
			level: 4,
			needEcho: false,
			title: "普通消息",
			content: "测试",
			actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
			type: "airConditioningControl",
			route: ""
		};
	}
	console.log("发送消息:" + userMobile + "___" + JSON.stringify(param));
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

	next(null, ResponseUtil.resp(Code.OK));
};

Handler.prototype.testOn = function (msg, session, next) {
	var self = this;
	var data = "00 01 11";
	var curPort = msg.port;
	var curIpAddress = msg.ipAddress;
	var param = {
		command: '3008',
		ipAddress: curIpAddress,
		data: data,
		port: curPort
	};
	console.log("向ots推送消息:" + JSON.stringify(param));
	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'socketServer*otron',
		sid: 'connector-server-1'
	}]);
	next(null, ResponseUtil.resp(Code.OK));
};

Handler.prototype.testOff = function (msg, session, next) {
	var self = this;
	var data = "00 01 18";
	var curPort = msg.port;
	var curIpAddress = msg.ipAddress;
	var param = {
		command: '3008',
		ipAddress: curIpAddress,
		data: data,
		port: curPort
	};
	console.log("向ots推送消息:" + JSON.stringify(param));
	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'socketServer*otron',
		sid: 'connector-server-1'
	}]);
	next(null, ResponseUtil.resp(Code.OK));
};

Handler.prototype.monitorhooker = function (msg, session, next) {
	next(null, ResponseUtil.resp(Code.OK));
};

/**
 消息列表
 **/
Handler.prototype.getNoticeList = function (msg, session, next) {
	console.log("进入消息列表::::::::" + JSON.stringify(msg));
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
		.sort({addTime: -1}).skip(skip).limit(pageSize).exec(function (err, notices) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
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
			next(null, ResponseUtil.resp(Code.OK, news));
		}
	});
};

/**
 消息详情
 **/
Handler.prototype.getNoticeDetail = function (msg, session, next) {
	var id = msg.noticeId;
	var userMobile = session.uid;
	NoticeModel.findOne({_id: new Object(id)}, function (err, notice) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			// 设置为已读
			NoticeModel.update({_id: id}, {$set: {hasRead: 1}}, function (err, docs) {
				if (err) console.log(err);
			});
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

			NoticeModel.count({hasRead: 0, userMobile: userMobile}, function (err, count) {
				if (err) console.log(err);
				else {
					next(null, {code:200, codetxt:"操作成功", data:n, count:count});
				}
			});
		}
	});
};

/**
 * 删除消息
 */
Handler.prototype.deleteNotice = function (msg, session, next) {
	var userMobile = session.uid;
	if (!!msg.noticeId) {
		var idArray = msg.noticeId.split(',');
		var ids = new Array();
		for (var i = 0; i < idArray.length; i++) {
			ids.push(idArray[i]);
		}

		NoticeModel.remove({_id: {$in: ids}}, function (err, docs) {
			if (err) console.log(err);
			else {
				NoticeModel.count({hasRead: 0, userMobile: userMobile}, function (err, count) {
					if (err) console.log(err);
					else {
						next(null, {code:200, codetxt:"操作成功", count:count});
					}
				});
			}
		});
	}
};

/**
 设置消息为已读
 **/
Handler.prototype.setNoticeRead = function (msg, session, next) {
	var userMobile = session.uid;
	var all = msg.all;
	if (!!all && (all == "1" || all == "all")) {
		NoticeModel.update({userMobile: userMobile}, {$set: {hasRead: 1}}, {multi: true}, function (err) {
			if (err) {
				console.log(err);
				next(null, ResponseUtil.resp(Code.DATABASE));
			} else {
				next(null, {code:200, codetxt:"操作成功", all:1});
			}
		});
	} else {
		if (!!msg.noticeId) {
			var idArray = msg.noticeId.split(',');
			var ids = new Array();
			for (var i = 0; i < idArray.length; i++) {
				ids.push(idArray[i]);
			}

			NoticeModel.update({_id: {$in: ids}}, {$set: {hasRead: 1}}, {multi: true}, function (err, docs) {
				if (err) console.log(err);
				else {
					NoticeModel.count({hasRead: 0, userMobile: userMobile}, function (err, count) {
						if (err) console.log(err);
						else {
							next(null, {code:200, codetxt:"操作成功", count:count});
						}
					});
				}
			});
		} else {
			next(null, {code:200, codetxt:"操作成功", msg:"没有ID，没有操作"});
		}
	}
};

Handler.prototype.getNoticeNotReadCount = function (msg, session, next) {
	var userMobile = session.uid;
	NoticeModel.count({hasRead: 0, userMobile: userMobile}, function (err, count) {
		if (err) console.log(err);
		else {
			NoticeModel.findOne({
				userMobile: userMobile,
				hasRead: 0
			}).sort({addTime: -1}).exec(function (err, lastNotice) {
				if (err) {
					console.log(err);
				} else {
					if (!!lastNotice) {
						var n = new Object();
						var today = new Date();
						var yesterday = new Date();
						yesterday.setDate(today.getDate() - 1);
						var addTime = lastNotice.addTime;
						if (addTime.getFullYear() == today.getFullYear() && addTime.getMonth() == today.getMonth() && addTime.getDate() == today.getDate()) {
							n.addTime = Moment(addTime).format('HH:mm');
						} else {
							if (addTime.getFullYear() == yesterday.getFullYear() && addTime.getMonth() == yesterday.getMonth() && addTime.getDate() == yesterday.getDate()) {
								n.addTime = "昨天";
							} else {
								n.addTime = Moment(addTime).format('MM-DD HH:mm');
							}
						}
						n.title = lastNotice.title;

						var noticeNotReadData = new Object();
						noticeNotReadData.notice = n;
						noticeNotReadData.count = count;
						next(null, {code:200, codetxt:"操作成功", data:noticeNotReadData});
					} else {
						var noDataRet = {"code": 200, "codetxt": "操作成功", data: {count: count}};
						next(null, noDataRet);
					}
				}
			});
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
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, subUsers));
		}
	});
};

/**
 设置子账户
 */
Handler.prototype.setSubUser = function (msg, session, next) {
	var targetMobile = msg.targetMobile;
	var selfMobile = session.uid;
	UserModel.update({mobile: targetMobile}, {$set: {parentUser: selfMobile}}, function (err, docs) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK));
		}
	});
};

Handler.prototype.getLastTerminalStatus = function (msg, session, next) {
	var terminalId = msg.terminalId;
	TSensorDataModel.findOne({terminalId: {$in: terminalId}}).sort({addTime: -1}).exec(function (err, sensorDatas) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			TerminalModel.findOne({_id: new Object(terminalId)}, function (err, terminal) {
				if (err) {
					console.log(err);
					next(null, ResponseUtil.resp(Code.DATABASE));
				} else {
					var homeGridId = terminal.homeGridId;
					UserEquipmentModel.count({
						terminalId: terminalId,
						status: '开',
						e_type: {$ne: '窗帘'}
					}, function (err, count) {
						if (err) {
							console.log(err);
						} else {
							next(null, {code:200, codetxt:"操作成功", data:sensorDatas, count:count, hmeGridId:homeGridId});
						}
					});
				}
			});

		}
	});
};

/**
 * 电视机状态反转
 * */
Handler.prototype.reverseTvStatus = function (msg, session, next) {
	var deviceId = msg.deviceId;
	UserEquipmentModel.findOne({_id: new Object(deviceId)}, function (err, tv) {
		if (err) {
			console.log(err);
			next(null, Code.DATABASE);
		} else {
			var s = tv.status;
			if (s == "开") {
				s = "关";
			} else {
				s = "开";
			}
			UserEquipmentModel.update({_id: new Object(deviceId)}, {$set: {status: s}}, function (updateErr, tv) {
				if (updateErr) {
					console.log(updateErr);
					next(null, Code.DATABASE);
				} else {
					next(null, Code.OK);
				}
			});
		}
	});
};

/******************************  在线统计  开始  ************************************/
Handler.prototype.getOnlineInfo = function (msg, session, next) {

};

/******************************  在线统计  结束  ************************************/


/******************************  物业方法  开始  ************************************/
/**
 * 获取账号快递信息
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.getCourierList = function (msg, session, next) {
	var userMobile = session.uid;
	var page = msg.page;
	if (page == undefined || page < 1) {
		page = 1;
	}
	var pageSize = msg.pageSize;
	if (pageSize == undefined || pageSize < 1) {
		pageSize = 10;
	}
	var skip = pageSize * (page - 1);
	CourierModel.find({userMobile: userMobile}).sort({time: -1}).skip(skip).limit(pageSize).exec(function (err, docs) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
		}
	});
};

Handler.prototype.toSendCourier = function (msg, session, next) {
	var self = this;
	var userMobile = msg.userMobile;
	var company = msg.company;
	var phone = msg.phone;
	var comment = msg.comment;

	var param = {
		type: "toSendCourier",
		company: company,
		phone: phone,
		comment: comment,
		userMobile: userMobile,
	};

	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'estate',
		sid: 'user-server-1'
	}]);

	next(null, ResponseUtil.resp(Code.OK));
};

Handler.prototype.addNewCourier = function (msg, session, next) {
	var self = this;
	var userMobile = msg.userMobile;
	var type = msg.type;
	var data = msg.data;

	/**
	 * 新的快递收发
	 * @type {{command: string, data: *}}
	 */
	var param = {
		command: '7002',
		level: 3,
		needEcho: false,
		data: data,
		title: "您有新的快递",
		content: "测试",
		actionId: 'xxxxxxxxxxxxxxxxxxxxxx',
		type: "airConditioningControl",
		route: ""
	};

	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: userMobile,
		sid: 'user-server-1'
	}]);
};

/**
 * 获取物业缴费记录列表
 */
Handler.prototype.getPayList = function (msg, session, next) {
	var userMobile = session.uid;
	PayModel.find({userMobile: userMobile}).sort({time: -1}).exec(function (err, docs) {
		if (err) {
			console.log(err);
			next(null, ResponseUtil.resp(Code.DATABASE));
		} else {
			next(null, ResponseUtil.resp(Code.OK, docs));
		}
	});
};

/**
 * 增加新的家政服务请求
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.addNewHouseKeeping = function (msg, session, next) {
	var self = this;
	var userMobile = session.uid;
	var age = msg.age;
	var sex = msg.sex;
	var type = msg.type;

	var param = {
		type: "houseKeeping",
		age: age,
		type: type,
		sex: sex,
		userMobile: userMobile,
	};
	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'estate',
		sid: 'user-server-1'
	}]);

	next(null, ResponseUtil.resp(Code.OK));
};

/**
 * 增加新的保修信息
 * @param msg
 * @param session
 * @param next
 */
Handler.prototype.addNewRepair = function (msg, session, next) {
	var self = this;
	var userMobile = session.uid;
	var describ = msg.description;
	var phone = msg.phone;

	var param = {
		type: "repair",
		isSolve: 0,
		describ: describ,
		phone: phone,
		userMobile: userMobile
	};
	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'estate',
		sid: 'user-server-1'
	}]);

	next(null, ResponseUtil.resp(Code.OK));
};

Handler.prototype.addNewComplaint = function (msg, session, next) {
	var self = this;
	var userMobile = session.uid;
	var describ = msg.description;
	var phone = msg.phone;

	var param = {
		type: "complaint",
		isSolve: 0,
		describ: describ,
		phone: phone,
		userMobile: userMobile
	};
	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'estate',
		sid: 'user-server-1'
	}]);

	next(null, ResponseUtil.resp(Code.OK));
};

/******************************  物业方法  结束  ************************************/

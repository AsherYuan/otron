var CenterBoxModel = require('../../../mongodb/models/CenterBoxModel');
var SensorDataModel = require('../../../mongodb/models/SensorDataModel');
var TerminalModel = require('../../../mongodb/models/TerminalModel');
var sessionManager = require('../../../domain/sessionService.js');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

/**
 * New client entry.
 *
 * @param  {Object}   msg     request message-
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
Handler.prototype.entry = function(msg, session, next) {
	var self = this;
	var rid = 'otron'; // 暂时全部统一m
	var uid = msg.uid + "*" + rid;
	var sessionService = self.app.get('sessionService');
	//duplicate log in
	if( !! sessionService.getByUid(uid)) {
		next(null, {
			code: 500,
			error: true
		});
		return;
	}

	session.bind(uid);
	session.set('rid', rid);
	session.push('rid', function(err) {
		if(err) {
			console.error('set rid for session service failed! error is : %j', err.stack);
		}
	});
	session.on('closed', function() {
		console.log('session closed');
	});

	// 如果不是TcpServer来的，放入allPushChannel频道里
	if(uid !== 'socketServer*otron') {
		var channelName = 'allPushChannel';
		var channel = self.app.get('channelService').getChannel(channelName, true);
		//把用户添加到channel 里面
		if (!!channel) {
			channel.add(uid, self.app.get('serverId'));
		}
	}

	self.app.rpc.centerbox.centerboxRemote.add(session, uid, self.app.get('serverId'), rid, true, function(){
		next(null, {
			msg:'连接成功'
		});
	});
};

/**
 * 原始根据当前连接发送消息 before 06-12
 * @param msg
 * @param session
 * @param next
 */
// Handler.prototype.socketMsg = function(msg, session, next) {
// 	var self = this;
// 	var command = msg.command;
// 	var param = {
// 		msg: ''
// 	};
// 	if(command == '1000') {
// 		param = {
// 			command: '1000',
// 			msg: '控制器上线, IP地址： ' + msg.ipAddress + ", 端口:" + msg.port,
// 			ipAddress: msg.ipAddress,
// 			port : msg.port,
// 			serialno : msg.serialno
// 		};
// 	} else if (command == '999') {
// 		param = {
// 			command:'999',
// 			ipAddress:msg.ipAddress,
// 			msg: '控制器断开连接, IP地址： ' + msg.ipAddress + ", 端口:" + msg.port
// 		};
// 	} else if(command == '1001') {
// 		param = {
// 			command:'1001',
// 			ipAddress:msg.ipAddress,
// 			terminalCode:msg.terminalCode,
// 			msg: '终端上线, 终端编码： ' + msg.terminalCode
// 		};
// 	} else if(command == '2000') {
// 		param = {
// 			command:'2000',
// 			ipAddress: msg.ipAddress,
// 			data:msg.data
// 		};
// 	} else if(command == '2001') {
// 		param = {
// 			command:'2000',
// 			ipAddress: msg.ipAddress,
// 			data:msg.data
// 		};
// 	} else if(command == '2002') {
// 		param = {
// 			command:'2000',
// 			ipAddress: msg.ipAddress,
// 			data:msg.data
// 		};
// 	} else if(command == '3000') {
// 		param = {
// 			command:'3000',
// 			ipAddress: msg.ipAddress,
// 			data:msg.data
// 		};
// 	} else if(command == '3007') {
// 		param = {
// 			command:'3007',
// 			ipAddress: msg.ipAddress,
// 			data:msg.data
// 		};
// 	} else if(command == '4000') {
// 		param = {
// 			command:'4000',
// 			ipAddress: msg.ipAddress,
// 			data:msg.data
// 		};
// 	}
//
// 	var channelName = 'allPushChannel';
// 	var pushChannel = self.app.get('channelService').getChannel(channelName, false);
// 	pushChannel.pushMessage('onMsg', param, function(err) {
// 		if (err) {
// 			console.log(err);
// 		} else {
// 			console.log('push ok');
// 		}
// 	});
// };

Handler.prototype.socketMsg = function(msg, session, next) {
	var self = this;

	console.log("-----");
	console.log("     " + JSON.stringify(msg));

	CenterBoxModel.findOne({serialno:msg.serialno}, function(err, doc) {
		if(err) console.log(err);
		else {
			var userMobile = doc.userMobile;
			var command = msg.command;
			var param = {
				msg: ''
			};
			if(command == '1000') {
				param = {
					command: '1000',
					msg: '控制器上线, IP地址： ' + msg.ipAddress + ", 端口:" + msg.port,
					ipAddress: msg.ipAddress,
					port : msg.port,
					serialno : msg.serialno
				};
			} else if (command == '999') {
				param = {
					command:'999',
					ipAddress:msg.ipAddress,
					msg: '控制器断开连接, IP地址： ' + msg.ipAddress + ", 端口:" + msg.port,
					serialno : msg.serialno
				};
			} else if(command == '1001') {
				param = {
					command:'1001',
					ipAddress:msg.ipAddress,
					terminalCode:msg.terminalCode,
					centerBoxSerialno:msg.serialno,
					terminalType:msg.terminalType,
					msg: '终端上线, 终端编码： ' + msg.terminalCode
				};
				// 如果没有，新建
				TerminalModel.find({centerBoxSerialno:msg.serialno, code:msg.terminalCode, type:msg.terminalType}, function(err,docs) {
					if(err) console.log(err);
					else {
						if(docs.length === 0) {
							// 新增终端数据
							var entity = new TerminalModel({code:msg.terminalCode, type:msg.terminalType, centerBoxSerialno:msg.serialno});
							entity.save(function(err, docs) {
								if (err) {
									console.log(err);
								}
							});
						}
					}
				});
			} else if(command == '2000') {
				param = {
					command:'2000',
					ipAddress: msg.ipAddress,
					data:msg.data
				};
			} else if(command == '2001') {
				param = {
					command:'2000',
					ipAddress: msg.ipAddress,
					data:msg.data
				};
			} else if(command == '2002') {
				param = {
					command:'2000',
					ipAddress: msg.ipAddress,
					data:msg.data
				};
			} else if(command == '3000') {
				param = {
					command:'3000',
					ipAddress: msg.ipAddress,
					data:msg.data
				};
			} else if(command == '3007') {
				param = {
					command:'3007',
					ipAddress: msg.ipAddress,
					data:msg.data
				};
			} else if(command == '4000') {
				var sensorData = msg.data;
				var temp = sensorData.substring(0, 4);
				temp = parseInt(temp, 16) / 10;
				var wet = sensorData.substring(4, 8);
				wet = parseInt(wet, 16) / 10;
				var co2 = sensorData.substring(8, 12);
				co2 = parseInt(co2, 16);
				var pm25 = sensorData.substring(12, 16);
				pm25 = parseInt(pm25, 16);
				var quality = sensorData.substring(16, 20);
				quality = parseInt(quality, 16);
				param = {
					command:'4000',
					ipAddress: msg.ipAddress,
					data:msg.data,
					temperature:temp,
					humidity:wet,
					co2:co2,
					pm25:pm25,
					quality:quality
				}

				CenterBoxModel.find({serialno:msg.serialno}, function(err, docs) {
					if(err) console.log(err);
					else {
						var cBox = docs[0];
						var sensorData = msg.data;
						var temp = sensorData.substring(0, 4);
						temp = parseInt(temp, 16) / 10;
						var wet = sensorData.substring(4, 8);
						wet = parseInt(wet, 16) / 10;
						var co2 = sensorData.substring(8, 12);
						co2 = parseInt(co2, 16);
						var pm25 = sensorData.substring(12, 16);
						pm25 = parseInt(pm25, 16);
						var quality = sensorData.substring(16, 20);
						quality = parseInt(quality, 16);
						var entity = new SensorDataModel({centerBoxId:cBox._id, temperature:temp, humidity:wet, co2:co2, quality:quality, pm25:pm25});
						entity.save(function(err, docs) {
							if(err) console.log(err);
						});
					}
				});
			}
			self.app.get('channelService').pushMessageByUids('onMsg', param, [{
				uid: userMobile,
				sid: 'user-server-1'
			}]);
		}
	});
};


Handler.prototype.webMsg = function(msg, session, next) {
	var self = this;

	var command = msg.command;
	var ipAddress = msg.ipAddress;
	var param = {
		msg: ''
	};
	if(command == '2000') {
		param = {
			command: '2000',
			ipAddress: msg.ipAddress
		};
	} else if (command == '2001') {
		param = {
			command: '2001',
			ipAddress: msg.ipAddress
		};
	} else if(command == '2002') {
		param = {
			command: '2002',
			ipAddress: msg.ipAddress,
			data: msg.terminalCode
		};
	} else if(command == '3000') {
		var terminalCode = msg.terminalCode;

		var suffix1 = ' 36 FF 00 8A 22 A2 A2 A2 28 A2 88 88 88 A2 AA AA 22 2A 22 2A 88 80 1F E0 11 44 54 54 54 45 14 51 11 11 14 55 55 44 45 44 45 51 10 00 00'; // 18度
		var suffix2 = ' 36 FF 00 8A 22 A2 A2 A2 28 AA 22 22 22 22 AA A2 A2 A8 A2 28 88 80 1F E0 11 44 54 54 54 45 15 44 44 44 44 55 54 54 55 14 45 11 10 00 00'; // 24度
		var data = terminalCode + suffix1;
		param = {
			command: '3000',
			ipAddress: msg.ipAddress,
			data: data
		};
	} else if(command == '3007') {
		var jCode = msg.terminalCode;
		var jData = jCode + '01FFFF';
		param = {
			command: '3007',
			ipAddress: msg.ipAddress,
			data: jData
		};
	}
	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'socketServer*otron',
		sid: self.app.get('serverId')
	}]);
};

Handler.prototype.controllerList = function(msg, session, next) {
	var self = this;
	CenterBoxModel.getList(function(err, docs) {
		if(err) {
			next(err);
		} else {
			next(null, docs);
		}
	});
};

Handler.prototype.deleteController = function(msg, session, next) {
	var self = this;

	var serialno = msg.serialno;
	CenterBoxModel.delteCtrl(serialno, function(flag) {
		next(null, {flag:flag});
	});
};



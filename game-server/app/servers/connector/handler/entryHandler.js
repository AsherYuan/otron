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
	// var command = msg.command;
	// var serialno = msg.serialno;
	// var receiver = msg.receiver;
	// var ipAddress = msg.ipAddress;
	// var port = msg.port;

	var rid = 'otron'; // 暂时全部统一
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

	//put user into channel
	self.app.rpc.centerbox.centerboxRemote.add(session, uid, self.app.get('serverId'), rid, true, function(){
		console.log(JSON.stringify(next));
		next(null, {
			msg:'连接成功'
		});
	});
};

Handler.prototype.socketMsg = function(msg, session, next) {
	var self = this;

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
			msg: '控制器断开连接, IP地址： ' + msg.ipAddress + ", 端口:" + msg.port
		};
	} else if(command == '1001') {
		param = {
			command:'1001',
			ipAddress:msg.ipAddress,
			terminalCode:msg.terminalCode,
			msg: '终端上线, 终端编码： ' + msg.terminalCode
		};
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
		param = {
			command:'4000',
			ipAddress: msg.ipAddress,
			data:msg.data
		};
	}

	self.app.get('channelService').pushMessageByUids('onMsg', param, [{
		uid: 'web*otron',
		sid: self.app.get('serverId')
	}]);
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

		var prefix = '21 02 00 00 30 00 01 00 00 30 ';
		var suffix1 = ' 36 FF 00 8A 22 A2 A2 A2 28 A2 88 88 88 A2 AA AA 22 2A 22 2A 88 80 1F E0 11 44 54 54 54 45 14 51 11 11 14 55 55 44 45 44 45 51 10 00 00'; // 18度
		var suffix2 = ' 36 FF 00 8A 22 A2 A2 A2 28 AA 22 22 22 22 AA A2 A2 A8 A2 28 88 80 1F E0 11 44 54 54 54 45 15 44 44 44 44 55 54 54 55 14 45 11 10 00 00'; // 24度
		var data = prefix + terminalCode + suffix1;
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

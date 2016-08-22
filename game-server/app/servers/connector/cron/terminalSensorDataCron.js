var CenterBoxModel = require('../../../mongodb/models/CenterBoxModel');
var TerminalModel = require('../../../mongodb/models/TerminalModel');
var TSensorDataModel = require('../../../mongodb/models/TSensorDataModel');

var Moment = require('moment');

module.exports = function (app) {
    return new Cron(app);
};
var Cron = function (app) {
    this.app = app;
};

/**
 * 定时任务，定时给所有用户去推送消息
 */
Cron.prototype.getSensorData = function () {
    var self = this;
    /**
     * 查找所有主控，要求有IP和PORT，来方便通信
     */
    CenterBoxModel.find({}, function(error, centerBoxs) {
        if(error) {
            console.log(error);
        } else {
            if(!!centerBoxs) {
                for(var i=0;i<centerBoxs.length;i++) {
                    if((!! centerBoxs[i].curIpAddress) && (!! centerBoxs[i].curPort)) {
                        console.log("定时任务中发现当前连接中的主控：" + centerBoxs[i].curIpAddress + "::" + centerBoxs[i].curPort + "___" + centerBoxs[i].serialno);
                        var curIpAddress = centerBoxs[i].curIpAddress;
                        var curPort = centerBoxs[i].curPort;
                        var centerBoxSerialno = centerBoxs[i].serialno;
                        TerminalModel.find({centerBoxSerialno:centerBoxSerialno, isOnline:true}, function(error, terminals) {
                            if(error) {
                                console.log(error);
                            } else {
                                if(!!terminals) {
                                    for (var i = 0; i < terminals.length; i++) {
                                        var code = terminals.code;
                                        var param = {
                                            command: '2005',
                                            ipAddress: curIpAddress,
                                            data: code,
                                            port: curPort
                                        };
                                        console.log("向硬件询问终端传感器数据：" + JSON.stringify(param));
                                        self.app.get('channelService').pushMessageByUids('onMsg', param, [{
                                            uid: 'socketServer*otron',
                                            sid: 'connector-server-1'
                                        }]);
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }
    });
};
var UserModel = require('../../../mongodb/models/UserModel');
var CenterBoxModel = require('../../../mongodb/models/CenterBoxModel');
var TerminalModel = require('../../../mongodb/models/TerminalModel');
var HomeGridModel = require('../../../mongodb/models/HomeGridModel');
var UserEquipmentModel = require('../../../mongodb/models/UserEquipmentModel');

var StringUtil = require('../../../util/StringUtil');

module.exports = function (app) {
	return new Cron(app);
};
var Cron = function (app) {
	this.app = app;
};

/**
 * 每分钟检测用户的各项指标，保存到SpecailEvent文档中，由连接池进行发送
 */
Cron.prototype.currentData = function () {

};
var Moment = require('moment');
var NoticeModel = require('../../../mongodb/models/NoticeModel');

module.exports = function (app) {
	return new Cron(app);
};
var Cron = function (app) {
	this.app = app;
};

/**
 * 定时任务，定时给所有用户去推送消息
 */
Cron.prototype.currentData = function () {
	var self = this;

	UserModel.find({}, function (err, docs) {
		if (err) console.log(err);
		else {
			for (var i = 0; i < docs.length; i++) {

				var userMobile = docs[i].mobile;
				var hasRead = 0;
				var title = "橙色大风报警" + new Date();
				var content = "6小时内可能受大风影响,平均风力可达10级以上，或阵风11级以上；或者已经受大风影响, 平均风力为10—11级，或阵风11—12级并可能持续。";
				var noticeType = 2;

				var NoticeEntity = new NoticeModel({userMobile:userMobile, hasRead:hasRead, title:title, content:content, noticeType:noticeType});
				NoticeEntity.save(function(err) {
					if(err) console.log(err);
				});

				var mobile = docs[i].mobile;
				var param = {
					command: '9001',
					title:'橙色大风报警',
					content:'6小时内可能受大风影响,平均风力可达10级以上，或阵风11级以上；或者已经受大风影响, 平均风力为10—11级，或阵风11—12级并可能持续。',
					addTime: new Date()
				};
				self.app.get('channelService').pushMessageByUids('onMsg', param, [{
					uid: mobile,
					sid: 'user-server-1'
				}]);
			}
		}
	});
};
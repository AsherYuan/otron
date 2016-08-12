var UserModel = require('../../../mongodb/models/UserModel');
var WeatherModel = require('../../../graber/weather/WeatherModel');
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
Cron.prototype.currentData = function () {
    var self = this;
    UserModel.find({}, function (err, docs) {
        if (err) console.log(err);
        else {
            WeatherModel.findOne({}, null, {sort: [{time: -1}]}, function (err, weatherNow) {
                if (err) console.log(err);
                else {
                    var addTime = Moment(weatherNow.time).format('YYYY-MM-DD HH:mm:ss');
                    var pm25 = weatherNow.pm;
                    var temperature = weatherNow.temperature;
                    var humidity = weatherNow.humidity;
                    var quality = weatherNow.air;
                    var co2 = 650; // TODO

                    for (var i = 0; i < docs.length; i++) {
                        var mobile = docs[i].mobile;
                        var param = {
                            command: '5000',
                            temperature: temperature,
                            humidity: humidity,
                            quality: quality,
                            co2: co2,
                            pm25: pm25,
                            addTime: addTime
                        };
                        self.app.get('channelService').pushMessageByUids('onMsg', param, [{
                            uid: mobile,
                            sid: 'user-server-1'
                        }]);
                    }
                }
            });
        }
    });
};
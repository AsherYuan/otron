var UserModel = require('../../../mongodb/models/UserModel');

module.exports = function(app) {
  return new Cron(app);
};
var Cron = function(app) {
  this.app = app;
};

Cron.prototype.currentData = function() {
  var self = this;

  UserModel.find({}, function(err, docs) {
    if(err) console.log(err);
    else {
      for(var i=0;i<docs.length;i++) {
        var mobile = docs[i].mobile;
        var param = {
          command:'5000',
          temp:43
        };
        console.log('推送消息');
        self.app.get('channelService').pushMessageByUids('onMsg', param, [{
          uid: mobile,
          sid: 'user-server-1'
        }]);
      }
    }
  });
};
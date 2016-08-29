var NoticeModel = require('../../../mongodb/models/NoticeModel');
var UserModel = require('../../../mongodb/models/UserModel');
var StringUtil = require('../../../util/StringUtil');

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
                var title = "奥运胜利闭幕";
                var content = '<p>中新网8月22日电 当地时间21日晚，2016年里约奥运会将举行闭幕式。这是这场持续十余天全球体育盛宴的最后谢幕，运动员们可以卸下多日比赛的重负，' +
                    '享受奥运的欢乐。热情的巴西人将如何让这场全球盛会完美谢幕？里约奥运圣火以什么样的方式熄灭？东京会如何展现4年后的自己？那些年，奥运会的闭幕式，' +
                    '哪些经典画面留给你深刻印象？</p><div style="text-align:center"><img alt="伦敦奥运会闭幕式，明星大腕歌手云集。" ' +
                    'src="http://cms-bucket.nosdn.127.net/catchpic/0/08/0891CBBF012463447966EDBAF7AF2078.jpg" style="border:px solid #000000" ' +
                    'title="伦敦奥运会闭幕式，明星大腕歌手云集。" /></div><div class="pictext" style="text-align:center;text-indent:2em; ">伦敦奥运会闭幕式，明星大腕歌手云集。</div>' +
                    '<p><strong>2012伦敦：经典歌曲大联唱</strong></p>' +
                    '<p>2012年伦敦夏季奥运会的闭幕式演出被命名为“英国音乐交响曲”，以“英国之声”为主题，这场闭幕式也被很多观众调侃为是经典歌曲联唱的“大夜场”。</p>' +
                    '<p>闭幕式的序幕在一位演员扮演的前英国首相丘吉尔的朗诵中揭开序幕。“辣妹”、皇后乐队、平克·弗洛伊德、The Who……这些歌手或乐队纷纷出山，和Jessie J、Ed Sheeran等新生代歌手同台飙歌，用顶尖的音乐展现英国本土文化的发扬和传承。</p>' +
                    '<p>除了出场的众多大牌歌手以外，闭幕式上还向英国音乐史上两位殿堂级人物致敬，分别是披头士乐队的主唱约翰·列侬和皇后乐队的主唱弗雷迪·墨丘利，引发全场观众掌声和大合唱。</p>';
                content = StringUtil.filterHtml(content);
                var noticeType = 1;
                var summary = content.substring(0, 60);

                var NoticeEntity = new NoticeModel({
                    userMobile: userMobile,
                    hasRead: hasRead,
                    title: title,
                    content: content,
                    noticeType: noticeType,
                    summary: summary
                });
                NoticeEntity.save(function (err) {
                    if (err) console.log(err);
                });

                var mobile = docs[i].mobile;
                var param = {
                    command: '9002',
                    title: '奥运胜利闭幕',
                    content: '<p>中新网8月22日电 当地时间21日晚，2016年里约奥运会将举行闭幕式。这是这场持续十余天全球体育盛宴的最后谢幕，运动员们可以卸下多日比赛的重负，' +
                    '享受奥运的欢乐。热情的巴西人将如何让这场全球盛会完美谢幕？里约奥运圣火以什么样的方式熄灭？东京会如何展现4年后的自己？那些年，奥运会的闭幕式，' +
                    '哪些经典画面留给你深刻印象？</p><div style="text-align:center"><img alt="伦敦奥运会闭幕式，明星大腕歌手云集。" ' +
                    'src="http://cms-bucket.nosdn.127.net/catchpic/0/08/0891CBBF012463447966EDBAF7AF2078.jpg" style="border:px solid #000000" ' +
                    'title="伦敦奥运会闭幕式，明星大腕歌手云集。" /></div><div class="pictext" style="text-align:center;text-indent:2em; ">伦敦奥运会闭幕式，明星大腕歌手云集。</div>' +
                    '<p><strong>2012伦敦：经典歌曲大联唱</strong></p>' +
                    '<p>2012年伦敦夏季奥运会的闭幕式演出被命名为“英国音乐交响曲”，以“英国之声”为主题，这场闭幕式也被很多观众调侃为是经典歌曲联唱的“大夜场”。</p>' +
                    '<p>闭幕式的序幕在一位演员扮演的前英国首相丘吉尔的朗诵中揭开序幕。“辣妹”、皇后乐队、平克·弗洛伊德、The Who……这些歌手或乐队纷纷出山，和Jessie J、Ed Sheeran等新生代歌手同台飙歌，用顶尖的音乐展现英国本土文化的发扬和传承。</p>' +
                    '<p>除了出场的众多大牌歌手以外，闭幕式上还向英国音乐史上两位殿堂级人物致敬，分别是披头士乐队的主唱约翰·列侬和皇后乐队的主唱弗雷迪·墨丘利，引发全场观众掌声和大合唱。</p>',
                    addTime: new Date(),
                    summary: summary
                };
                self.app.get('channelService').pushMessageByUids('onMsg', param, [{
                    uid: mobile,
                    sid: 'user-server-1'
                }]);
            }
        }
    });
};
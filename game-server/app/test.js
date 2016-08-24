var NoticeModel = require('./mongodb/models/NoticeModel');

var update = function(id, summary, i) {
	NoticeModel.update({_id:id}, {$set:{summary:summary}}, function(err, docs) {
		console.log("更新完第" + i + "条数据");
	});
};

NoticeModel.find({}, function(err, docs) {
	for(var i=0;i<docs.length;i++) {
		var id = docs[i]._id;
		var summary = docs[i].content.substring(0, 60);
		update(id, summary, i);
	}
}).skip(2000).limit(500);
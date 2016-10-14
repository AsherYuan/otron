var UserWordsTest = module.exports;

UserWordsTest.answer = function(words) {
	if(words.indexOf('出门') > -1) {
		return "已为您关闭房间1空调，电视，电灯，并根据您的使用习惯保留了空气加湿器";
	} else if(words.indexOf('回家') > -1) {
		return "欢迎回家，已为您打开房间1空调，并根据您的使用习惯设置到21度，制冷模式";
	} else if(words.indexOf('有什么好看的节目') > -1) {
		return "根据百度热搜榜推荐，已为您挑选电视剧幻城，并将电视设置到 湖南卫视频道 ";
	} else {
		return null;
	}
};
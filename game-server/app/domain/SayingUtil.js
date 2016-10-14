/**
 * Created with JetBrains WebStorm.
 * User: AsherYuan
 * Date: 14-1-2
 * Time: 上午11:22
 */

var SayingUtil = module.exports;

// 根据状态调整返回给用户的语句
SayingUtil.translateStatus = function (order) {
	if (!!order) {
		console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<,,解析文本>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
		console.log(JSON.stringify(order));
		var deviceName = order.ueq.e_name;
		if (!deviceName) {
			deviceName = order.ueq.pinpai + order.ueq.e_type;
		}

		var action = "";
		if (order.ueq.e_type == "空调") {
			if (order.ueq.status == "关") {
				action = "关闭" + deviceName;
			} else {
				if (!!order.describe && order.describe.indexOf("上下文") > -1) {
					if(order.describe.indexOf("风速变化:+") > -1) {
						action = "调高" + deviceName + "的风速,";
					} else if(order.describe.indexOf("风速变化:-") > -1) {
						action = "调低" + deviceName + "的风速,";
					} else if(order.describe.indexOf("温度变化:+") > -1) {
						action = "调高" + deviceName + "的温度,";
					} else if(order.describe.indexOf("温度变化:-") > -1) {
						action = "调低" + deviceName + "的温度,";
					}
				} else {
					action = "打开" + deviceName + ", 并设置为" + order.ueq.ac_model;
					if (order.ueq.ac_windspeed == 0) {
						action += "自动,";
					} else if (order.ueq.ac_windspeed == 1) {
						action += "小风,";
					} else if (order.ueq.ac_windspeed == 2) {
						action += "中风,";
					} else if (order.ueq.ac_windspeed == 3) {
						action += "大风,";
					}
					action += order.ueq.ac_temperature + "度";
				}
			}
		} else if (order.ueq.e_type == "电视") {
			var itv = order.c_tv.inst;
			if(itv == "T_ONOFF") {
				var tvStatus = order.ueq.status;
				if(tvStatus == "开") {
					action = "打开" + deviceName;
				} else if(tvStatus = "关") {
					action = "关闭" + deviceName;
				}
			} else if(itv == "T_V+") {
				action = "调高" + deviceName + "的音量";
			} else if(itv == "T_V-") {
				action = "降低" + deviceName + "的音量";
			} else if(itv == "T_P-") {
				action = deviceName + "转到上一个台";
			} else if(itv == "T_P+") {
				action = deviceName + "转到下一个台";
			} else if(itv == "T_OK") {
				action = "确认" + deviceName + "的当前操作";
			} else if(itv == "T_RETURN") {
				action = "返回" + deviceName + "的上一个界面";
			} else if(itv == "T_MENU") {
				action = "打开" + deviceName + "的菜单";
			} else if(itv == "T_MUTE") {
				var tvMute = order.ueq.tv_ismute;
				if(tvMute) {
					action = "取消" + deviceName + "的静音";
				} else {
					action = "静音" + deviceName;
				}
				action = "点击" + deviceName + "的静音键";
			} else if(itv == "T_UP") {
				action = deviceName + "的上移";
			} else if(itv == "T_DOWN") {
				action = deviceName + "的下移";
			} else if(itv == "T_LEFT") {
				action = deviceName + "的左移";
			} else if(itv == "T_RIGHT") {
				action = deviceName + "的右移";
			} else if(itv == "T_HOME") {
				action = "返回" + deviceName + "的主页";
			}
		} else {
			if (order.c_other.inst == "D_TEST_OFF") {
				action = "关掉" + deviceName;
			} else if (order.c_other.inst == "D_TEST_ON") {
				action = "打开" + deviceName;
			} else if (order.c_other.inst == "C_TEST_OFF") {
				action = "关上" + deviceName;
			} else if (order.c_other.inst == "C_TEST_ON") {
				action = "拉开" + deviceName;
			}
		}
		return action;
	} else {
		return null;
	}
};
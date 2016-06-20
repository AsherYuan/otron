/**
 * Created with JetBrains WebStorm.
 * User: zhangyu
 * Date: 13-8-5
 * Time: 下午1:01
 */

var Error_cn = {
  FA_TOKEN_INVALID: 'token验证失败',
  FA_USER_NOT_EXIST: '用户不存在',
  DUPLICATED_LOGIN: '重复登录',
  ACCOUNT : {
    MOBILE_IS_BLANK : '手机号码不能为空',
    PASSWORD_IS_BLANK : '密码不能为空',
    USER_NOT_EXIST : '用户不存在',
    PASSWORD_NOT_CORRECT : '密码不正确'
  },
  SUCC : "操作成功"
};



lang_cn = {
  // WEIBO_INVITE_SUCCESS: '成功激活邀请码奖励: ',
  // WEIBO_INVITE_ERR_CODE: '无效邀请码，\n没有邀请码请直接登录',
  // WEIBO_INVITE_MULTI_SUCCESS: '成功邀请{0}个好友奖励',
  // LADDER_START: '还有{0}排位战开启',
  // LADDER_RANK_REWARD: '恭喜您获得{date}排名奖励，您当前的排位战排名为第{rank}名，要继续努力哦！',
  // LADDER_RANK_REWARD_SEASON: '恭喜您获得{date}季度排名奖励，您当前的排位战排名为第{rank}名，要继续努力哦！',
  // LADDER_RANK_REWARD_TITLE: '恭喜您获得{date}排名奖励',
  // LADDER_RANK_REWARD_SEASON_TITLE: '恭喜您获得{date}季度排名奖励',
  // ARENA_START: '还有{0}竞技场开启',
  // ARENA_RANK_REWARD_SEASON: '恭喜您获得{date}季度竞技场奖励，您当前的排名为第{rank}名，要继续努力哦！',
  // ARENA_RANK_REWARD_SEASON_TITLE: '恭喜您获得{date}季度竞技场奖励',
  // LADDER_NOT_JOIN: '您{date}没有参加排位战，分数下降{score}',
  // LADDER_NOT_5: '您{date}参加排位战次数不足5盘，分数下降{score}',
  // GAME_INVITE_SUCCESS: '恭喜您完成邀请任务！您邀请的玩家【{0}】顺利升至20级了！领取奖励的同时别忘了快去感谢TA吧！{1}完成任务奖励：',
  // SHOP_IAP_SUCCESS: '恭喜您成功充值{diamond}晶钻',
  // SHOP_IAP_SUCCESS_SPRING: '恭喜您成功充值{diamond}晶钻, 活动赠送{gift}晶钻',
  // SHOP_IAP_VIP_SUCCESS: '恭喜您成功购买{level}级VIP',

  Error : Error_cn
};

var lang = module.exports;
lang.localLang = lang_cn;
lang.error = lang.localLang.Error;

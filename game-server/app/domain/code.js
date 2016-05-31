/**
 * Created with JetBrains WebStorm.
 * User: zhangjun
 * Date: 6/26/13
 * Time: 12:10 下午
 * To change this template use File | Settings | File Templates.
 */
var Lang = require('./data/language.js');

module.exports = {
  OK: 200,
  FAIL: 500,
  TOO_BUSY:555,

  SERVER_CLOSE : {'errcode' : 561, 'errmsg' : Lang.error.SERVER_CLOSE},

  COMMON : {'errcode' : 100},         //通用错误

  ENTRY: {
    FA_TOKEN_INVALID: 	1001,
    FA_USER_NOT_EXIST: 	1003
  },

  ACCOUNT : {
    USER_NOT_EXIST : {'errcode' : 2001, 'errmsg' : Lang.error.ACCOUNT.USER_NOT_EXIST},
    NO_MONEY : {'errcode' : 2002, 'errmsg' : Lang.error.ACCOUNT.NO_MONEY},
    NO_ENERGY : {'errcode' : 2003, 'errmsg' : Lang.error.ACCOUNT.NO_ENERGY}
  }
};

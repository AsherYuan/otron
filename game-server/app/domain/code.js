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
    FA_TOKEN_INVALID: 	{'errcode':1001, 'errmsg':Lang.error.FA_TOKEN_INVALID},
    FA_USER_NOT_EXIST: 	{'errcode':1002, 'errmsg':Lang.error.FA_USER_NOT_EXIST},
  },

  ACCOUNT : {
    MOBILE_IS_BLANK: {'errcode' : 2001, 'errmsg' : Lang.error.ACCOUNT.MOBILE_IS_BLANK},
    PASSWORD_IS_BLANK: {'errcode' : 2002, 'errmsg' : Lang.error.ACCOUNT.PASSWORD_IS_BLANK},
    USER_NOT_EXIST : {'errcode' : 2003, 'errmsg' : Lang.error.ACCOUNT.USER_NOT_EXIST},
    PASSWORD_NOT_CORRECT : {'errcode' : 2004, 'errmsg' : Lang.error.ACCOUNT.PASSWORD_NOT_CORRECT}
  }
};

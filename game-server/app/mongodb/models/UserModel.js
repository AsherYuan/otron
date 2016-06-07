var mongoose = require('../mongoose.js');
var UserScheme = new mongoose.Schema({
    mobile : {type:String},//手机号
    username : {type:String}, // 用户名
    password : {type:String}, // 密码
    regTime : { type:Date, default:Date.now }, //首次注册时间
    lastLoginTime : { type:Date, default:Date.now }, // 最后登录时间
    name:{type:String}, //真实姓名
    homeIds : [mongoose.Schema.Types.ObjectId]
});
var UserModel = mongoose.model("user", UserScheme);
module.exports = UserModel;
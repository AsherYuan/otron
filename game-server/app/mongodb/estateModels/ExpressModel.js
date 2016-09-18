var mongoose = require('../mongoose.js');

var ExpressSchema = new mongoose.Schema({
	userMobile:String,
	company:String,
	
	type:String,
	name:String
});
var DeviceBrandModel = mongoose.model("deviceBrand", DeviceBrandSchema);
module.exports = DeviceBrandModel;
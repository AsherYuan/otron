var mongoose = require('../mongoose.js');

var UserEquipmentSchema = new mongoose.Schema({
    home_id:mongoose.Schema.Types.ObjectId,
    layerName:String,
    e_name:String,
    pingpai:String,
    e_pos:String,
    e_type:String,
    status:String,
    ac_model:String,
    ac_windspeed:Number,
    ac_temperature:Number,
    terminalId:mongoose.Schema.Types.ObjectId,
    homeGridId:mongoose.Schema.Types.ObjectId,
    series:String,
    addTime:{type:Date, default:Date.now},
});
var UserEquipmentModel = mongoose.model("userEquipment", UserEquipmentSchema, "userEquipment");
module.exports = UserEquipmentModel;
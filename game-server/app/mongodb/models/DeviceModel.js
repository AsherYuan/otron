var mongoose = require('../mongoose.js');

var DeviceStatusSchema = new mongoose.Schema({
  power:Number
});

var DeviceSchema = new mongoose.Schema({
  homeId:mongoose.Schema.Types.ObjectId,
  layerName:String,
  terminalId:mongoose.Schema.Types.ObjectId,
  homeGridId:mongoose.Schema.Types.ObjectId,
  type:String,
  brand:String,
  series:String,
  addTime:{type:Date, default:Date.now},
  name:String,
  status:DeviceStatusSchema
});
var DeviceModel = mongoose.model("device", DeviceSchema);
module.exports = DeviceModel;
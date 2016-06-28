var mongoose = require('../mongoose.js');

var TerminalSchema = new mongoose.Schema({
  centerBoxSerialno:String,
  homeGridId:mongoose.Schema.Types.ObjectId,
  code:String,
  type:String,
  regTime : { type:Date, default:Date.now }
});

var HomeGridScheme = new mongoose.Schema({
  homeId : mongoose.Schema.Types.ObjectId,
  gridType : String,
  layerName : String,
  terminalId:mongoose.Schema.Types.ObjectId,
  dorder : Number,
  name : String,
  terminal: [TerminalSchema]
});
var HomeGridModel = mongoose.model("homeGrid", HomeGridScheme);
module.exports = HomeGridModel;
var mongoose = require('../mongoose.js');

var TerminalSchema = new mongoose.Schema({
  centerBoxSerialno:String,
  homeGridId:String,
  code:String,
  type:String,
  regTime : { type:Date, default:Date.now }
});

var HomeGridScheme = new mongoose.Schema({
  homeId : String,
  gridType : String,
  layerName : String,
  terminalId:String,
  dorder : Number,
  name : String,
  terminal: [TerminalSchema]
});
var HomeGridModel = mongoose.model("homeGrid", HomeGridScheme);
module.exports = HomeGridModel;
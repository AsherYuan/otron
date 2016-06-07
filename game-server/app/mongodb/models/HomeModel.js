var mongoose = require('../mongoose.js');

var HomeLayerSchema = new mongoose.Schema({
  name : String,
  room : Number,
  hall : Number,
  toilet : Number,
  kitchen : Number
});

var HomeSchema = new mongoose.Schema({
  floorId : mongoose.Schema.Types.ObjectId,
  floorName : String,
  addTime : {type:Date, default:Date.now },
  userMobile : String,
  layers:[HomeLayerSchema]
});
var HomeModel = mongoose.model("home", HomeSchema);
module.exports = HomeModel;
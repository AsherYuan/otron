var mongoose = require('../mongoose.js');
var HomeGridScheme = new mongoose.Schema({
  homeId : mongoose.Schema.Types.ObjectId,
  gridType : String,
  layerName : String,
  dorder : Number,
  name : String
});
var HomeGridModel = mongoose.model("homeGrid", HomeGridScheme);
module.exports = HomeGridModel;
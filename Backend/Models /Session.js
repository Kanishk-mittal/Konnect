const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  UserId : {type : mongoose.Schema.Types.ObjectId, ref : "User" , required : true},
  session_Token : {type : String , required : true} ,
  sessionBeginAt : {type : Date , default:Date.now},
  sessionExpiry : {type :Date , required : true },

});

module.exports = mongoose.exports("Session", SessionSchema);

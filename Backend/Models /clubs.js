const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema({
  club_Name : {type : String , required : true },
  Creator_Id : {type : mongoose.Schema.Types.ObjectId ,ref : "User", required : true},
  Created_time : {type : Date , default :Date.now} , 
  Updated_time : {type : Date , default : Date.now },
})

module.exports = mongoose.model("Clubs",clubSchema);

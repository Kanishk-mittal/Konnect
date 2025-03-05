const mongoose = require("mongoose");

const clubMembershipSchema = new mongoose.Schema({
    Club_id : {type : mongoose.Schema.Types.ObjectId,ref : "Clubs", required : true},
    User_id : {type : mongoose.Schema.Types.ObjectId , ref :"User" , required : true},
    Role : {type : String , enum : ["Member" ,"Admin"] , required : true},
    joined_at :{type : Date , default : Date.now} ,
    invitationStatus : {type : String , enum : ["requested","pending" ,"accepted"] ,default : "pending"},

});

module.exports = mongoose.model("clubsMem", clubMembershipSchema);

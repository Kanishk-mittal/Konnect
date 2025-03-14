const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
club_id: {type : mongoose.Schema.Types.ObjectId , ref : "Club" ,required: false },
sender_id : {type : mongoose.Schema.Types.ObjectId , ref : "User" , required : true },
receiver_id : {type : mongoose.Schema.Types.ObjectId , ref : "User" , required : false },
message_type : {type : String , enum : ["text" ,"file"] , required : true} ,
content : {type : String ,required : true },
timeStamp : {type :Date , default : Date.now},
is_read : {type : Boolean , default: false },
reply_to : {type : mongoose.Schema.Types.ObjectId , ref :"Message" , required : false } , // for reply purpose 
deleted : {type : Boolean , default : false }
});

module.exports = mongoose.model("Messages" , MessageSchema);

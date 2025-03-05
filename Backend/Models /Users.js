const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name : {type : String , required : true},
    roll_Num : {type : String ,unique : true  , required : true },
    passWord : {type : String , required : true } , 
    role : {type : String , required : true , enum : ["Student" ,"Admin" , "clubAdmin"]}, 
    public_key : {type : String , reuired : false  }, // encryption purpose ;;;
    profile_pic : {type : String , required : false },
    // status :  {type : String , required : false , default : "Let's Konnect!"}  // if required 
    last_seen : {type : Date , default : Date.now}, // last Active
    is_online : {type : Boolean , default : false}  // Real-Time Tracking

});

module.exports = mongoose.model("User" , UserSchema);

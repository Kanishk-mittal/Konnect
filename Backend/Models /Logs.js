const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema({
    UserId : {type : mongoose.Schema.Types.ObjectId , ref : "User" , required : true},
    Activity_type : {type : String , enum : ["failed_login", "suspicious_activity", "login_success"] , required : true }, 
    ip_address : {type : String , required : true}, 
    timestamp :{type :Date , default :Date.now},
    DeviceType :{type : String , required : false }, 
});

module.exports = mongoose.exports("logs" , LogSchema);

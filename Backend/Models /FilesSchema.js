const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
    File_Name  : {type : String ,required: true } , 
    File_path : {type : String , required : true },
    File_type : {type : String  , required : true },
    File_size : {type : Number , required : true },
    Uploaders_id : {type : mongoose.Schema.Types.ObjectId , ref :  "User" , required : true },
    Access_control : [{type : mongoose.Schema.Types.ObjectId , ref  : "User" }],
    Uploaded_At : {type : Date , default : Date.now},

});

module.exports = mongoose.exports("Files" ,FileSchema) ;

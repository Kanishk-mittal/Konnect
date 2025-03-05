const mongoose = require("mongoose");


const ChatHistorySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    chats: [
        {
            message_id: { type: mongoose.Schema.Types.ObjectId, ref: "Messages", required: true },
            sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
            receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
            content: { type: String, required: true },
            message_type: { type: String, enum: ["text", "file"], required: true },
            timestamp: { type: Date, default: Date.now },
            is_read: { type: Boolean, default: false }
        }
    ]
});

module.exports = mongoose.model("ChatHistory" ,ChatHistorySchema);

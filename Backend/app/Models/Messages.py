import datetime
from bson import ObjectId
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC

class Messages:
    def __init__(self, sender_id: str, content: str, message_type: str = "text",
                 receiver_id: str = None, club_id: str = None, timestamp=None, 
                 is_read: bool = False, message_id: str = None, reply_to: str = None,
                 deleted: bool = False):
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.club_id = club_id
        self.message_type = message_type  # text or file
        self.content = content
        self.timestamp = timestamp if timestamp else datetime.datetime.now()
        self.is_read = is_read
        self.message_id = message_id
        self.reply_to = reply_to
        self.deleted = deleted

    def to_db(self, db):
        """Save message to database with encrypted fields"""
        message_data = {
            "sender_id": encrypt_AES_CBC(self.sender_id),
            "message_type": encrypt_AES_CBC(self.message_type),
            "content": encrypt_AES_CBC(self.content),
            "timeStamp": self.timestamp,
            "is_read": self.is_read,
            "deleted": self.deleted
        }

        # Only add these fields if they have values
        if self.receiver_id:
            message_data["receiver_id"] = encrypt_AES_CBC(self.receiver_id)
        if self.club_id:
            message_data["club_id"] = encrypt_AES_CBC(self.club_id)
        if self.reply_to:
            message_data["reply_to"] = encrypt_AES_CBC(self.reply_to)
        
        if self.message_id:
            message_data["_id"] = ObjectId(self.message_id)
            
        return db.messages.insert_one(message_data)

    def to_dict(self):
        """Convert message object to dictionary for API responses"""
        result = {
            "message_id": str(self.message_id) if self.message_id else None,
            "sender_id": self.sender_id,
            "message_type": self.message_type,
            "content": self.content,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime.datetime) else self.timestamp,
            "is_read": self.is_read,
            "deleted": self.deleted
        }
        
        if self.receiver_id:
            result["receiver_id"] = self.receiver_id
        if self.club_id:
            result["club_id"] = self.club_id
        if self.reply_to:
            result["reply_to"] = self.reply_to
            
        return result

    @staticmethod
    def from_db(message_data):
        """Create a Messages object from database document"""
        if not message_data:
            return None
            
        return Messages(
            sender_id=decrypt_AES_CBC(message_data["sender_id"]),
            content=decrypt_AES_CBC(message_data["content"]),
            message_type=decrypt_AES_CBC(message_data["message_type"]),
            receiver_id=decrypt_AES_CBC(message_data.get("receiver_id")) if message_data.get("receiver_id") else None,
            club_id=decrypt_AES_CBC(message_data.get("club_id")) if message_data.get("club_id") else None,
            timestamp=message_data.get("timeStamp"),
            is_read=message_data.get("is_read", False),
            message_id=str(message_data["_id"]) if "_id" in message_data else None,
            reply_to=decrypt_AES_CBC(message_data.get("reply_to")) if message_data.get("reply_to") else None,
            deleted=message_data.get("deleted", False)
        )

    @staticmethod
    def get_conversation(user1_id: str, user2_id: str, db, limit: int = 50):
        """Retrieve direct conversation between two users"""
        messages = db.messages.find({
            "$or": [
                {"$and": [
                    {"sender_id": encrypt_AES_CBC(user1_id)}, 
                    {"receiver_id": encrypt_AES_CBC(user2_id)},
                    {"deleted": False}
                ]},
                {"$and": [
                    {"sender_id": encrypt_AES_CBC(user2_id)}, 
                    {"receiver_id": encrypt_AES_CBC(user1_id)},
                    {"deleted": False}
                ]}
            ]
        }).sort("timeStamp", -1).limit(limit)
        
        return [Messages.from_db(message) for message in messages]

    @staticmethod
    def get_club_messages(club_id: str, db, limit: int = 50):
        """Retrieve messages for a specific club"""
        encrypted_club_id = encrypt_AES_CBC(club_id)
        messages = db.messages.find({
            "club_id": encrypted_club_id,
            "deleted": False
        }).sort("timeStamp", -1).limit(limit)
        
        return [Messages.from_db(message) for message in messages]

    @staticmethod
    def mark_as_read(message_id: str, db):
        """Mark a message as read"""
        try:
            db.messages.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": {"is_read": True}}
            )
            return True
        except:
            return False

    @staticmethod
    def soft_delete(message_id: str, db):
        """Soft delete a message (mark as deleted without removing from database)"""
        try:
            db.messages.update_one(
                {"_id": ObjectId(message_id)},
                {"$set": {"deleted": True}}
            )
            return True
        except:
            return False

import datetime
from bson import ObjectId
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC

class Messages:
    def __init__(self, sender: str, message: str, receiver: str = None, 
                 group: str = None, timestamp=None, aes_key: str = None):
        self.sender = sender
        self.receiver = receiver
        self.group = group  # null if it's a DM
        self.message = message  # Already encrypted
        self.timestamp = timestamp if timestamp else datetime.datetime.now()
        self.aes_key = aes_key  # Already encrypted

    def to_db(self, db):
        """Save message to database with encrypted fields - temporarily stored until user logs in"""
        message_data = {
            "sender": encrypt_AES_CBC(self.sender),
            "message": self.message,  # Already encrypted
            "timeStamp": self.timestamp,
            "aes_key": self.aes_key  # Already encrypted
        }

        # Only add these fields if they have values
        if self.receiver:
            message_data["receiver"] = encrypt_AES_CBC(self.receiver)
        if self.group:
            message_data["group"] = encrypt_AES_CBC(self.group)
        
        return db.temp_messages.insert_one(message_data)

    def to_dict(self):
        """Convert message object to dictionary for API responses"""
        # Make sure the sender and receiver are not in encrypted form
        sender = self.sender
        receiver = self.receiver
        
        # Check if sender looks like an encrypted string (base64 format)
        if isinstance(sender, str) and sender.endswith('=') and len(sender) > 20:
            try:
                sender = decrypt_AES_CBC(sender)
            except:
                pass  # If decryption fails, keep the original value
                
        # Similarly for receiver
        if receiver and isinstance(receiver, str) and receiver.endswith('=') and len(receiver) > 20:
            try:
                receiver = decrypt_AES_CBC(receiver)
            except:
                pass
                
        result = {
            "sender": sender,
            "message": self.message,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime.datetime) else self.timestamp,
        }
        
        if receiver:
            result["receiver"] = receiver
        if self.group:
            # Check if group needs decryption too
            group = self.group
            if isinstance(group, str) and group.endswith('=') and len(group) > 20:
                try:
                    group = decrypt_AES_CBC(group)
                except:
                    pass
            result["group"] = group
            
        if self.aes_key:
            result["aes_key"] = self.aes_key
            
        return result

    @staticmethod
    def from_db(message_data):
        """Create a Messages object from database document"""
        if not message_data:
            return None
            
        return Messages(
            sender=decrypt_AES_CBC(message_data["sender"]),
            message=message_data["message"],  # Keep encrypted
            receiver=decrypt_AES_CBC(message_data.get("receiver")) if message_data.get("receiver") else None,
            group=decrypt_AES_CBC(message_data.get("group")) if message_data.get("group") else None,
            timestamp=message_data.get("timeStamp"),
            aes_key=message_data.get("aes_key")  # Keep encrypted
        )

    @staticmethod
    def get_conversation(user1: str, user2: str, db, limit: int = 50):
        """Retrieve direct conversation between two users"""
        messages = db.temp_messages.find({
            "$or": [
                {"$and": [
                    {"sender": encrypt_AES_CBC(user1)}, 
                    {"receiver": encrypt_AES_CBC(user2)}
                ]},
                {"$and": [
                    {"sender": encrypt_AES_CBC(user2)}, 
                    {"receiver": encrypt_AES_CBC(user1)}
                ]}
            ]
        }).sort("timeStamp", -1).limit(limit)
        
        return [Messages.from_db(message) for message in messages]

    @staticmethod
    def get_group_messages(group: str, db, limit: int = 50):
        """Retrieve messages for a specific group"""
        encrypted_group = encrypt_AES_CBC(group)
        messages = db.temp_messages.find({
            "group": encrypted_group
        }).sort("timeStamp", -1).limit(limit)
        
        return [Messages.from_db(message) for message in messages]

    @staticmethod
    def cleanup_messages(user_id: str, db):
        """Remove messages that have been delivered to the user"""
        try:
            db.temp_messages.delete_many({
                "receiver": encrypt_AES_CBC(user_id)
            })
            return True
        except:
            return False

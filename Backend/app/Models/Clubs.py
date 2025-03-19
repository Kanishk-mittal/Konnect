import datetime
from bson import ObjectId
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC

class Clubs:
    def __init__(self, club_name: str, creator_id: str, 
                 club_id: str = None, created_time=None, updated_time=None):
        self.club_name = club_name
        self.creator_id = creator_id
        self.club_id = club_id
        self.created_time = created_time if created_time else datetime.datetime.now()
        self.updated_time = updated_time if updated_time else datetime.datetime.now()

    def to_db(self, db):
        """Save club to database with encrypted fields"""
        club_data = {
            "club_Name": encrypt_AES_CBC(self.club_name),
            "Creator_Id": encrypt_AES_CBC(self.creator_id),
            "Created_time": self.created_time,
            "Updated_time": self.updated_time
        }
        
        if self.club_id:
            club_data["_id"] = ObjectId(self.club_id)
            return db.clubs.update_one({"_id": ObjectId(self.club_id)}, {"$set": club_data})
        else:
            result = db.clubs.insert_one(club_data)
            self.club_id = str(result.inserted_id)
            return result

    def to_dict(self):
        """Convert club object to dictionary for API responses"""
        return {
            "club_id": str(self.club_id) if self.club_id else None,
            "club_name": self.club_name,
            "creator_id": self.creator_id,
            "created_time": self.created_time.isoformat() if isinstance(self.created_time, datetime.datetime) else self.created_time,
            "updated_time": self.updated_time.isoformat() if isinstance(self.updated_time, datetime.datetime) else self.updated_time
        }

    @staticmethod
    def from_db(club_data):
        """Create a Club object from database document"""
        if not club_data:
            return None
            
        return Clubs(
            club_name=decrypt_AES_CBC(club_data["club_Name"]),
            creator_id=decrypt_AES_CBC(club_data["Creator_Id"]),
            club_id=str(club_data["_id"]) if "_id" in club_data else None,
            created_time=club_data.get("Created_time"),
            updated_time=club_data.get("Updated_time")
        )

    @staticmethod
    def find_by_id(club_id: str, db):
        """Find a club by ID"""
        try:
            club_data = db.clubs.find_one({"_id": ObjectId(club_id)})
            return Clubs.from_db(club_data) if club_data else None
        except:
            return None

    @staticmethod
    def find_by_creator(creator_id: str, db):
        """Find all clubs created by a specific user"""
        encrypted_creator_id = encrypt_AES_CBC(creator_id)
        clubs = db.clubs.find({"Creator_Id": encrypted_creator_id})
        return [Clubs.from_db(club) for club in clubs]

    def update_name(self, new_name: str, db):
        """Update the club name"""
        if self.club_id:
            self.club_name = new_name
            self.updated_time = datetime.datetime.now()
            db.clubs.update_one(
                {"_id": ObjectId(self.club_id)},
                {"$set": {
                    "club_Name": encrypt_AES_CBC(new_name),
                    "Updated_time": self.updated_time
                }}
            )
            return True
        return False

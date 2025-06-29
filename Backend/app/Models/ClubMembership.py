import datetime
from bson import ObjectId
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC

class ClubMembership:
    def __init__(self, club_id: str, user_id: str, role: str = "Member",
                 invitation_status: str = "pending", joined_at=None, membership_id: str = None):
        self.club_id = club_id
        self.user_id = user_id
        self.role = role  # "Member" or "Admin"
        self.invitation_status = invitation_status  # "requested", "pending", or "accepted"
        self.joined_at = joined_at if joined_at else datetime.datetime.now()
        self.membership_id = membership_id

    def to_db(self, db):
        """Save club membership to database with encrypted fields"""
        membership_data = {
            "Club_id": encrypt_AES_CBC(self.club_id),
            "User_id": encrypt_AES_CBC(self.user_id),
            "Role": encrypt_AES_CBC(self.role),
            "invitationStatus": encrypt_AES_CBC(self.invitation_status),
            "joined_at": self.joined_at
        }
        
        if self.membership_id:
            membership_data["_id"] = ObjectId(self.membership_id)
            return db.clubsMem.update_one({"_id": ObjectId(self.membership_id)}, {"$set": membership_data})
        else:
            result = db.clubsMem.insert_one(membership_data)
            self.membership_id = str(result.inserted_id)
            return result

    def to_dict(self):
        """Convert club membership object to dictionary for API responses"""
        return {
            "membership_id": str(self.membership_id) if self.membership_id else None,
            "club_id": self.club_id,
            "user_id": self.user_id,
            "role": self.role,
            "invitation_status": self.invitation_status,
            "joined_at": self.joined_at.isoformat() if isinstance(self.joined_at, datetime.datetime) else self.joined_at
        }

    @staticmethod
    def from_db(membership_data):
        """Create a ClubMembership object from database document"""
        if not membership_data:
            return None
            
        return ClubMembership(
            club_id=decrypt_AES_CBC(membership_data["Club_id"]),
            user_id=decrypt_AES_CBC(membership_data["User_id"]),
            role=decrypt_AES_CBC(membership_data["Role"]),
            invitation_status=decrypt_AES_CBC(membership_data["invitationStatus"]),
            joined_at=membership_data.get("joined_at"),
            membership_id=str(membership_data["_id"]) if "_id" in membership_data else None
        )

    @staticmethod
    def get_club_members(club_id: str, db, status: str = "accepted"):
        """Get all members of a club with a specific invitation status"""
        encrypted_club_id = encrypt_AES_CBC(club_id)
        encrypted_status = encrypt_AES_CBC(status)
        
        memberships = db.clubsMem.find({
            "Club_id": encrypted_club_id,
            "invitationStatus": encrypted_status
        })
        
        return [ClubMembership.from_db(membership) for membership in memberships]

    @staticmethod
    def get_user_clubs(user_id: str, db, status: str = "accepted"):
        """Get all clubs that a user is a member of with a specific invitation status"""
        encrypted_user_id = encrypt_AES_CBC(user_id)
        encrypted_status = encrypt_AES_CBC(status)
        
        memberships = db.clubsMem.find({
            "User_id": encrypted_user_id,
            "invitationStatus": encrypted_status
        })
        
        return [ClubMembership.from_db(membership) for membership in memberships]

    @staticmethod
    def update_status(membership_id: str, new_status: str, db):
        """Update the invitation status of a club membership"""
        try:
            db.clubsMem.update_one(
                {"_id": ObjectId(membership_id)},
                {"$set": {"invitationStatus": encrypt_AES_CBC(new_status)}}
            )
            return True
        except:
            return False

    @staticmethod
    def update_role(membership_id: str, new_role: str, db):
        """Update the role of a club member"""
        try:
            db.clubsMem.update_one(
                {"_id": ObjectId(membership_id)},
                {"$set": {"Role": encrypt_AES_CBC(new_role)}}
            )
            return True
        except:
            return False

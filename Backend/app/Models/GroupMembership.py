import datetime
import uuid

class GroupMembership:
    def __init__(self, roll_number: str, group_id: str, 
                 role: str = "member", joined_at=None, membership_id: str = None):
        self.roll_number = roll_number
        self.group_id = group_id
        self.role = role  # "member" or "admin"
        self.joined_at = joined_at if joined_at else datetime.datetime.now()
        self.membership_id = membership_id

    def to_db(self, db):
        """Save group membership to database with encrypted fields"""
        from app.utils import encrypt_AES_CBC
        
        membership_data = {
            "roll_number": encrypt_AES_CBC(self.roll_number),
            "group_id": encrypt_AES_CBC(self.group_id),
            "role": encrypt_AES_CBC(self.role),
            "joined_at": self.joined_at
        }
        
        # Check if this membership already exists
        existing = db.groupMemberships.find_one({
            "roll_number": encrypt_AES_CBC(self.roll_number),
            "group_id": encrypt_AES_CBC(self.group_id)
        })
        
        if existing:
            if self.membership_id is None:
                self.membership_id = str(existing["_id"])
            return db.groupMemberships.update_one(
                {"_id": existing["_id"]},
                {"$set": membership_data}
            )
        else:
            result = db.groupMemberships.insert_one(membership_data)
            self.membership_id = str(result.inserted_id)
            return result

    def to_dict(self):
        """Convert group membership object to dictionary for API responses"""
        return {
            "membership_id": self.membership_id,
            "roll_number": self.roll_number,
            "group_id": self.group_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat() if isinstance(self.joined_at, datetime.datetime) else self.joined_at
        }

    @staticmethod
    def from_db(membership_data):
        """Create a GroupMembership object from database document"""
        from app.utils import decrypt_AES_CBC
        
        if not membership_data:
            return None
            
        return GroupMembership(
            roll_number=decrypt_AES_CBC(membership_data["roll_number"]),
            group_id=decrypt_AES_CBC(membership_data["group_id"]),
            role=decrypt_AES_CBC(membership_data["role"]),
            joined_at=membership_data.get("joined_at"),
            membership_id=str(membership_data["_id"]) if "_id" in membership_data else None
        )

    @staticmethod
    def get_user_groups(roll_number: str, db):
        """Get all groups that a user is a member of"""
        from app.utils import encrypt_AES_CBC, decrypt_AES_CBC
        
        # Since we can't directly query by encrypted value (due to random IV),
        # we need to retrieve all memberships and filter in application code
        all_memberships = list(db.groupMemberships.find())
        return [
            GroupMembership.from_db(membership) 
            for membership in all_memberships 
            if decrypt_AES_CBC(membership["roll_number"]) == roll_number
        ]

    @staticmethod
    def get_group_members(group_id: str, db):
        """Get all members of a specific group"""
        from app.utils import encrypt_AES_CBC, decrypt_AES_CBC
        
        # Since we can't directly query by encrypted value (due to random IV),
        # we need to retrieve all memberships and filter in application code
        all_memberships = list(db.groupMemberships.find())
        return [
            GroupMembership.from_db(membership) 
            for membership in all_memberships 
            if decrypt_AES_CBC(membership["group_id"]) == group_id
        ]

    @staticmethod
    def get_membership(roll_number: str, group_id: str, db):
        """Get a specific membership"""
        from app.utils import decrypt_AES_CBC
        
        # We can't directly query by encrypted value (due to random IV),
        # so we need to iterate through all memberships and check by decrypting each one
        all_memberships = list(db.groupMemberships.find())
        
        for membership in all_memberships:
            try:
                decrypted_roll = decrypt_AES_CBC(membership["roll_number"])
                decrypted_group = decrypt_AES_CBC(membership["group_id"])
                
                if decrypted_roll == roll_number and decrypted_group == group_id:
                    return GroupMembership.from_db(membership)
            except Exception as e:
                print(f"Error decrypting membership: {e}")
                continue
                
        return None

    @staticmethod
    def update_role(roll_number: str, group_id: str, new_role: str, db):
        """Update a user's role in a group"""
        from app.utils import encrypt_AES_CBC
        
        membership = GroupMembership.get_membership(roll_number, group_id, db)
        if membership:
            membership.role = new_role
            membership.to_db(db)
            return True
        return False

    @staticmethod
    def remove_member(roll_number: str, group_id: str, db):
        """Remove a member from a group"""
        from app.utils import encrypt_AES_CBC
        
        result = db.groupMemberships.delete_one({
            "roll_number": encrypt_AES_CBC(roll_number),
            "group_id": encrypt_AES_CBC(group_id)
        })
        return result.deleted_count > 0

    @staticmethod
    def is_member(roll_number: str, group_id: str, db):
        """Check if a user is a member of a group"""
        # Simply use the get_membership method which already handles the proper decryption
        membership = GroupMembership.get_membership(roll_number, group_id, db)
        return membership is not None

    @staticmethod
    def is_admin(roll_number: str, group_id: str, db):
        """Check if a user is an admin of a group"""
        membership = GroupMembership.get_membership(roll_number, group_id, db)
        return membership is not None and membership.role == "admin"

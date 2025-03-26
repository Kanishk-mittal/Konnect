import uuid
import datetime
from bson import ObjectId

class Group:
    def __init__(self, name: str, description: str = None, picture: str = None,
                 id: str = None, created_at=None, updated_at=None):
        self.id = id if id else str(uuid.uuid4())
        self.name = name
        self.description = description
        self.picture = picture
        self.created_at = created_at if created_at else datetime.datetime.now()
        self.updated_at = updated_at if updated_at else datetime.datetime.now()

    def to_db(self, db):
        """Save group to database with encrypted fields"""
        from app.utils import encrypt_AES_CBC
        
        group_data = {
            "id": encrypt_AES_CBC(self.id),
            "name": encrypt_AES_CBC(self.name),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
        
        # Only add these fields if they have values
        if self.description:
            group_data["description"] = encrypt_AES_CBC(self.description)
        if self.picture:
            group_data["picture"] = encrypt_AES_CBC(self.picture)

        # Check if the group already exists
        existing_group = db.groups.find_one({"id": encrypt_AES_CBC(self.id)})
        
        if existing_group:
            # Update existing group
            return db.groups.update_one(
                {"_id": existing_group["_id"]},
                {"$set": group_data}
            )
        else:
            # Insert new group
            result = db.groups.insert_one(group_data)
            return result

    def to_dict(self):
        """Convert group object to dictionary for API responses"""
        result = {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime.datetime) else self.created_at,
            "updated_at": self.updated_at.isoformat() if isinstance(self.updated_at, datetime.datetime) else self.updated_at
        }
        
        if self.description:
            result["description"] = self.description
        if self.picture:
            result["picture"] = self.picture
            
        return result

    @staticmethod
    def from_db(group_data):
        """Create a Group object from database document"""
        from app.utils import decrypt_AES_CBC
        
        if not group_data:
            return None
            
        return Group(
            id=decrypt_AES_CBC(group_data["id"]),
            name=decrypt_AES_CBC(group_data["name"]),
            description=decrypt_AES_CBC(group_data.get("description")) if group_data.get("description") else None,
            picture=decrypt_AES_CBC(group_data.get("picture")) if group_data.get("picture") else None,
            created_at=group_data.get("created_at"),
            updated_at=group_data.get("updated_at")
        )

    @staticmethod
    def find_by_id(group_id: str, db):
        """Find a group by ID"""
        from app.utils import encrypt_AES_CBC, decrypt_AES_CBC
        
        encrypted_id = encrypt_AES_CBC(group_id)
        group_data = db.groups.find_one({"id": encrypted_id})
        return Group.from_db(group_data) if group_data else None

    @staticmethod
    def find_by_name(group_name: str, db):
        """Find a group by name"""
        from app.utils import encrypt_AES_CBC, decrypt_AES_CBC
        
        # Since we can't easily query encrypted fields by value,
        # we need to fetch all groups and filter in the application
        all_groups = db.groups.find()
        
        for group_data in all_groups:
            try:
                decrypted_name = decrypt_AES_CBC(group_data["name"])
                if decrypted_name == group_name:
                    return Group.from_db(group_data)
            except Exception as e:
                # Handle potential decryption errors
                print(f"Error decrypting group name: {e}")
                continue
                
        return None

    @staticmethod
    def get_all_groups(db, limit: int = 100):
        """Get all groups"""
        groups = db.groups.find().limit(limit)
        return [Group.from_db(group_data) for group_data in groups]
        
    @staticmethod
    def search_groups(query: str, db, limit: int = 20):
        """
        Search for groups by name
        Note: This is an approximation because we can't perform regex on encrypted fields
        """
        # This method requires decrypting all groups and filtering in application code
        # Not efficient for large databases, but necessary with encrypted fields
        all_groups = Group.get_all_groups(db)
        results = [group for group in all_groups if query.lower() in group.name.lower()]
        return results[:limit]

    def update(self, name=None, description=None, picture=None, db=None):
        """Update group fields"""
        if name:
            self.name = name
        if description is not None:  # Allow empty description updates
            self.description = description
        if picture is not None:  # Allow empty picture updates
            self.picture = picture
            
        self.updated_at = datetime.datetime.now()
        
        if db:
            return self.to_db(db)
        return True

    @staticmethod
    def delete_group(group_id: str, db):
        """Delete a group and all its memberships"""
        from app.utils import encrypt_AES_CBC
        
        encrypted_id = encrypt_AES_CBC(group_id)
        
        # Delete the group memberships first
        db.groupMemberships.delete_many({"group_id": encrypted_id})
        
        # Then delete the group itself
        result = db.groups.delete_one({"id": encrypted_id})
        return result.deleted_count > 0

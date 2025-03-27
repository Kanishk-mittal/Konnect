import hashlib
import datetime  # Add this import to fix the error
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC, encryptRSA, external_key  # Changed from extenal_key

def hash_roll(roll: str) -> str:
    # Returns a hex digest of the SHA256 hash of the roll number.
    return hashlib.sha256(roll.encode()).hexdigest()

class User:
    def __init__(self, name: str, roll_number: str, password: str, email: str, role: str, public_key: str = None, profile_pic: str = None, is_online: bool = False):
        self.name = name
        self.roll_number = roll_number
        self.password = generate_password_hash(password)
        self.email = email
        self.role = role
        self.public_key = public_key
        self.profile_pic = profile_pic
        self.is_online = is_online

    def to_db(self, db):
        return db.users.insert_one({
            "name": encrypt_AES_CBC(self.name),
            "roll_number": encrypt_AES_CBC(self.roll_number),  # Roll number should be encrypted, not hashed
            "password": self.password,
            "email": encrypt_AES_CBC(self.email),
            "role": encrypt_AES_CBC(self.role),
            "public_key": encrypt_AES_CBC(self.public_key) if self.public_key else None,
            "profile_pic": encrypt_AES_CBC(self.profile_pic) if self.profile_pic else None,
            "is_online": self.is_online
        })

    def update_db(self, db):
        """Update user data in the database"""
        return db.users.update_one(
            {"roll_number": encrypt_AES_CBC(self.roll_number)},
            {"$set": {
                "name": encrypt_AES_CBC(self.name),
                "email": encrypt_AES_CBC(self.email),
                "role": encrypt_AES_CBC(self.role),
                "public_key": encrypt_AES_CBC(self.public_key) if self.public_key else None,
                "profile_pic": encrypt_AES_CBC(self.profile_pic) if self.profile_pic else None,
                "is_online": self.is_online
            }}
        )

    def check_unique(self, db):
        """Check if a user with this roll number already exists"""
        users = db.users.find()
        for user in users:
            if decrypt_AES_CBC(user["roll_number"]) == self.roll_number:
                return False
        return True
    
    def get_AES_key(self):
        """Encrypt external AES key using user's public key to return to client"""
        if not self.public_key:
            return None
        return encryptRSA(external_key, self.public_key.decode())

    def get_user_groups(self, db):
        """
        Get all groups that this user is a member of.
        
        Args:
            db: Database connection object
            
        Returns:
            list: A list of dictionaries containing group information
        """
        from app.Models.GroupMembership import GroupMembership
        from app.Models.Group import Group
        
        # Get all group memberships for this user
        memberships = GroupMembership.get_user_groups(self.roll_number, db)
        
        if not memberships:
            print(f"No memberships found for user {self.roll_number}")
            return []
        
        # Get detailed information for each group
        groups = []
        for membership in memberships:
            group_id = membership.group_id
            print(f"Looking for group with ID: {group_id}")
            group = Group.find_by_id(group_id, db)
            
            if group:
                groups.append({
                    "id": group_id,
                    "name": group.name,
                    "description": group.description if hasattr(group, 'description') else None,
                    "role": membership.role,
                    "joined_at": membership.joined_at.isoformat() if isinstance(membership.joined_at, datetime.datetime) else membership.joined_at
                })
            else:
                print(f"Group with ID {group_id} not found")
        
        return groups

    @staticmethod
    def verify(roll: str, password: str, db):
        users = db.users.find()
        user = None
        for i in users:
            if decrypt_AES_CBC(i["roll_number"]) == roll:
                user = i
                break
        if not user or not check_password_hash(user["password"], password):
            return False
        return True

    def to_dict(self):
        """Convert user object to dictionary for API responses"""
        return {
            "roll_number": self.roll_number,
            "name": self.name,
            "email": self.email,
            "is_online": self.is_online
        }

    @staticmethod
    def from_db(roll_number=None, db=None, user_doc=None):
        """Create a User object from database either by roll number or from a document"""
        # If user document is provided directly
        if user_doc:
            decrypted_roll = decrypt_AES_CBC(user_doc.get("roll_number"))
            return User(
                decrypt_AES_CBC(user_doc["name"]),
                decrypted_roll,
                user_doc["password"],
                decrypt_AES_CBC(user_doc["email"]),
                decrypt_AES_CBC(user_doc["role"]),
                decrypt_AES_CBC(user_doc["public_key"]) if user_doc.get("public_key") else None,
                decrypt_AES_CBC(user_doc["profile_pic"]) if user_doc.get("profile_pic") else None,
                user_doc.get("is_online", False)
            )
        
        # If searching by roll number - Fix the boolean evaluation of db
        if roll_number is not None and db is not None:
            users = db.users.find()
            for user in users:
                if decrypt_AES_CBC(user["roll_number"]) == roll_number:
                    return User.from_db(user_doc=user)
        
        return None

    @staticmethod
    def get_all_users(db):
        """
        Get all users from the database
        
        Args:
            db: Database connection object
            
        Returns:
            list: A list of dictionaries with basic user information
        """
        users = []
        user_docs = db.users.find()
        
        for user_doc in user_docs:
            # Only decrypt and extract the needed fields
            users.append({
                "roll_number": decrypt_AES_CBC(user_doc.get("roll_number")),
                "name": decrypt_AES_CBC(user_doc.get("name")),
                "is_online": user_doc.get("is_online", False)
            })
        
        return users
        
    @staticmethod
    def is_online(roll_number, db):
        """
        Check if a user is currently online
        
        Args:
            roll_number: The roll number of the user to check
            db: Database connection object
            
        Returns:
            bool: True if the user is online, False otherwise
        """
        users = db.users.find()
        for user in users:
            if decrypt_AES_CBC(user.get("roll_number")) == roll_number:
                return user.get("is_online", False)
        return False
import hashlib
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC, encryptRSA, external_key

def hash_roll(roll: str) -> str:
    # Returns a hex digest of the SHA256 hash of the roll number.
    return hashlib.sha256(roll.encode()).hexdigest()

class User:
    def __init__(self, name: str, roll_number: str, password: str, email: str, role: str, public_key: str = None, profile_pic: str = None, is_online: bool = False, description: str = None):
        self.name = name
        self.roll_number = roll_number
        self.password = generate_password_hash(password)
        self.email = email
        self.role = role
        self.public_key = public_key
        self.profile_pic = profile_pic
        self.is_online = is_online
        self.description = description if description else f"Hello my name is {name} and i am student of IIITK"

    def to_db(self, db):
        # Create a hash of the roll number for stable lookups
        roll_hash = hash_roll(self.roll_number)
        
        return db.users.insert_one({
            "name": encrypt_AES_CBC(self.name),
            "roll_number": encrypt_AES_CBC(self.roll_number),
            "roll_number_hash": roll_hash,  # Store a hash for lookup
            "password": self.password,
            "email": encrypt_AES_CBC(self.email),
            "role": encrypt_AES_CBC(self.role),
            "public_key": encrypt_AES_CBC(self.public_key) if self.public_key else None,
            "profile_pic": encrypt_AES_CBC(self.profile_pic) if self.profile_pic else None,
            "is_online": self.is_online,
            "description": encrypt_AES_CBC(self.description) if self.description else None
        })

    def update_db(self, db):
        """Update user data in the database"""
        # Use roll_number_hash for reliable lookups
        roll_hash = hash_roll(self.roll_number)
        
        # Log more details to debug the update issue
        print(f"Updating user {self.roll_number} in database, setting online status to: {self.is_online}")
        
        # Use find_one_and_update with the hash for reliable lookups
        result = db.users.find_one_and_update(
            {"roll_number_hash": roll_hash},
            {"$set": {
                "name": encrypt_AES_CBC(self.name),
                "email": encrypt_AES_CBC(self.email),
                "role": encrypt_AES_CBC(self.role),
                "public_key": encrypt_AES_CBC(self.public_key) if self.public_key else None,
                "profile_pic": encrypt_AES_CBC(self.profile_pic) if self.profile_pic else None,
                "is_online": self.is_online,
                "description": encrypt_AES_CBC(self.description) if self.description else None
            }},
            return_document=True  # Return the updated document
        )
        
        # Check if update was successful and log it
        if result:
            print(f"Updated user {self.roll_number} successfully, now online status is: {result.get('is_online')}")
            return {"modified_count": 1}
        else:
            print(f"Failed to update user {self.roll_number}, document not found")
            return {"modified_count": 0}

    def check_unique(self, db):
        """Check if a user with this roll number already exists"""
        roll_hash = hash_roll(self.roll_number)
        user = db.users.find_one({"roll_number_hash": roll_hash})
        return user is None
    
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
            "is_online": self.is_online,
            "description": self.description
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
                user_doc.get("is_online", False),
                decrypt_AES_CBC(user_doc["description"]) if user_doc.get("description") else None
            )
        
        # If searching by roll number - use hash for reliable lookups
        if roll_number is not None and db is not None:
            roll_hash = hash_roll(roll_number)
            user = db.users.find_one({"roll_number_hash": roll_hash})
            if user:
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
        # Use roll_number_hash for reliable lookups instead of encrypted roll
        roll_hash = hash_roll(roll_number)
        user = db.users.find_one({"roll_number_hash": roll_hash})
        
        if user:
            # Add debug logging to help diagnose the issue
            online_status = user.get("is_online", False)
            print(f"Checking online status for {roll_number}: {online_status}")
            return online_status
        
        print(f"User {roll_number} not found in database when checking online status")
        return False

    def get_credentials(self):
        return {
            "username": self.name,
            "description": self.description
        }
import hashlib
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

    @staticmethod
    def from_db(roll_number: str, db):
        users = db.users.find()
        for user in users:
            if decrypt_AES_CBC(user["roll_number"]) == roll_number:
                return User(
                    decrypt_AES_CBC(user["name"]),
                    roll_number,
                    user["password"],
                    decrypt_AES_CBC(user["email"]),
                    decrypt_AES_CBC(user["role"]),
                    decrypt_AES_CBC(user["public_key"]) if user["public_key"] else None,
                    decrypt_AES_CBC(user["profile_pic"]) if user["profile_pic"] else None,
                    user["is_online"]
                )
        return None
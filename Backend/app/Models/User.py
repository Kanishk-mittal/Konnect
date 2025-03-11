from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC

class User:
    def __init__(self, name: str, roll_number: str, password: str,email:str, role: str, public_key: str = None, profile_pic: str = None, is_online: bool = False):
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
            "roll_number": encrypt_AES_CBC(self.roll_number),
            "password": self.password,
            "email": encrypt_AES_CBC(self.email),
            "role": encrypt_AES_CBC(self.role),
            "public_key": encrypt_AES_CBC(self.public_key) ,
            "profile_pic": encrypt_AES_CBC(self.profile_pic) ,
            "is_online": self.is_online
        })
    def get_AES_key():
        return""

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
        user = db.users.find_one({"roll_number": encrypt_AES_CBC(roll_number)})
        if user:
            return User(
                decrypt_AES_CBC(user["name"]),
                decrypt_AES_CBC(user["roll_number"]),
                user["password"],
                decrypt_AES_CBC(user["email"]),
                decrypt_AES_CBC(user["role"]),
                decrypt_AES_CBC(user["public_key"]),
                decrypt_AES_CBC(user["profile_pic"]),
                user["is_online"]
            )
        return None
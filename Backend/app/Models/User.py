class User:
    def __init__(self, name: str, roll_number: int, email: str, password: str):
        self.name = name
        self.roll_number = roll_number
        self.email = email
        self.password = password

    def to_db(self, db):
        return db.users.insert_one({
            "name": self.name,
            "roll_number": self.roll_number,
            "email": self.email,
            "password": self.password
        })
    @staticmethod
    def verify(roll_number:int, hashed_password:str,db):
        user = db.users.find_one({"roll_number": roll_number})
        if user and user["password"] == hashed_password:
            return True
        return False
    @staticmethod
    def from_db(roll_number:int, db):
        user = db.users.find_one({"roll_number": roll_number})
        if user:
            return User(user["name"], user["roll_number"], user["email"], user["password"])
        return None
        
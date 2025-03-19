import datetime
from bson import ObjectId
from app.utils import encrypt_AES_CBC, decrypt_AES_CBC

class Files:
    def __init__(self, file_name: str, file_path: str, file_type: str, 
                 file_size: int, uploader_id: str, access_control: list = None, 
                 uploaded_at=None, file_id: str = None):
        self.file_name = file_name
        self.file_path = file_path
        self.file_type = file_type
        self.file_size = file_size
        self.uploader_id = uploader_id
        self.access_control = access_control if access_control else []
        self.uploaded_at = uploaded_at if uploaded_at else datetime.datetime.now()
        self.file_id = file_id

    def to_db(self, db):
        """Save file record to database with encrypted fields"""
        file_data = {
            "File_Name": encrypt_AES_CBC(self.file_name),
            "File_path": encrypt_AES_CBC(self.file_path),
            "File_type": encrypt_AES_CBC(self.file_type),
            "File_size": self.file_size,  # No need to encrypt numerical values
            "Uploaders_id": encrypt_AES_CBC(self.uploader_id),
            "Access_control": [encrypt_AES_CBC(user_id) for user_id in self.access_control],
            "Uploaded_At": self.uploaded_at
        }
        
        if self.file_id:
            file_data["_id"] = ObjectId(self.file_id)
            return db.files.update_one({"_id": ObjectId(self.file_id)}, {"$set": file_data})
        else:
            result = db.files.insert_one(file_data)
            self.file_id = str(result.inserted_id)
            return result

    def to_dict(self):
        """Convert file object to dictionary for API responses"""
        return {
            "file_id": str(self.file_id) if self.file_id else None,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "uploader_id": self.uploader_id,
            "access_control": self.access_control,
            "uploaded_at": self.uploaded_at.isoformat() if isinstance(self.uploaded_at, datetime.datetime) else self.uploaded_at
        }

    @staticmethod
    def from_db(file_data):
        """Create a Files object from database document"""
        if not file_data:
            return None
            
        return Files(
            file_name=decrypt_AES_CBC(file_data["File_Name"]),
            file_path=decrypt_AES_CBC(file_data["File_path"]),
            file_type=decrypt_AES_CBC(file_data["File_type"]),
            file_size=file_data["File_size"],
            uploader_id=decrypt_AES_CBC(file_data["Uploaders_id"]),
            access_control=[decrypt_AES_CBC(user_id) for user_id in file_data.get("Access_control", [])],
            uploaded_at=file_data.get("Uploaded_At"),
            file_id=str(file_data["_id"]) if "_id" in file_data else None
        )

    @staticmethod
    def find_by_id(file_id: str, db):
        """Find a file by ID"""
        try:
            file_data = db.files.find_one({"_id": ObjectId(file_id)})
            return Files.from_db(file_data) if file_data else None
        except:
            return False

    @staticmethod
    def find_by_uploader(uploader_id: str, db):
        """Find all files uploaded by a specific user"""
        encrypted_uploader_id = encrypt_AES_CBC(uploader_id)
        files = db.files.find({"Uploaders_id": encrypted_uploader_id})
        return [Files.from_db(file_data) for file_data in files]

    @staticmethod
    def find_accessible_by_user(user_id: str, db):
        """Find all files accessible to a specific user"""
        encrypted_user_id = encrypt_AES_CBC(user_id)
        files = db.files.find({
            "$or": [
                {"Uploaders_id": encrypted_user_id},
                {"Access_control": encrypted_user_id}
            ]
        })
        return [Files.from_db(file_data) for file_data in files]

    def grant_access(self, user_id: str, db):
        """Grant access to a user"""
        if user_id not in self.access_control:
            self.access_control.append(user_id)
            db.files.update_one(
                {"_id": ObjectId(self.file_id)},
                {"$push": {"Access_control": encrypt_AES_CBC(user_id)}}
            )
            return True
        return False

    def revoke_access(self, user_id: str, db):
        """Revoke access from a user"""
        if user_id in self.access_control:
            self.access_control.remove(user_id)
            db.files.update_one(
                {"_id": ObjectId(self.file_id)},
                {"$pull": {"Access_control": encrypt_AES_CBC(user_id)}}
            )
            return True
        return False

    def check_access(self, user_id: str):
        """Check if a user has access to this file"""
        return user_id == self.uploader_id or user_id in self.access_control

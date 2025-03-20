import datetime
from bson.objectid import ObjectId

class OTP:
    def __init__(self, email, otp, expires_at):
        self.email = email
        self.otp = otp
        self.expires_at = expires_at
        self.verified = False

    def save(self, db):
        db['otp'].insert_one({
            "email": self.email,
            "otp": self.otp,
            "expires_at": self.expires_at,
            "verified": self.verified
        })

    @staticmethod
    def verify(db, email, otp_code):
        otp_entry = db['otp'].find_one({
            "email": email,
            "otp": otp_code
        })

        if otp_entry and otp_entry['expires_at'] > datetime.datetime.utcnow():
            # Update the OTP entry as verified
            db['otp'].update_one(
                {"_id": otp_entry['_id']},
                {"$set": {"verified": True}}
            )
            return True
        return False

    @staticmethod
    def is_verified(db, email):
        otp_entry = db['otp'].find_one({
            "email": email,
            "verified": True
        })
        return otp_entry is not None

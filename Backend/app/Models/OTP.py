import datetime
import random


class OTP:
    def __init__(self, email):
        self.email = email
        self.otp = str(random.randint(100000, 999999))
        self.expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
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
        
        if not otp_entry:
            return False
            
        # Get the current time as a timezone-naive datetime for comparison
        # or convert the stored datetime to timezone-aware
        now = datetime.datetime.now(datetime.timezone.utc)
        expires_at = otp_entry['expires_at']
        
        # Handle timezone conversion if needed
        if expires_at.tzinfo is None:  # If stored datetime is naive
            # Convert to aware by assuming it's in UTC
            expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
        
        # Now both datetimes have timezone info and can be compared
        if expires_at > now:
            # Delete the OTP entry if valid
            db['otp'].delete_one({
                "email": email,
                "otp": otp_code
            })
            return True
        return False

    @staticmethod
    def is_verified(db, email):
        otp_entry = db['otp'].find_one({
            "email": email,
            "verified": True
        })
        return otp_entry is not None
        
    @staticmethod
    def get_by_email(email, db=None):
        """
        Retrieve the OTP record for a given email.
        
        Args:
            email (str): The email address to retrieve the OTP for
            db: MongoDB database connection (optional)
            
        Returns:
            dict or None: The OTP document or None if not found
        """
        if db is None:
            from app.utils import db as utils_db
            db = utils_db
            
        return db['otp'].find_one({"email": email})

    @staticmethod
    def delete_by_email(email, db=None):
        """
        Delete OTP records associated with an email.
        
        Args:
            email (str): The email address to delete OTP records for
            db: MongoDB database connection (optional)
            
        Returns:
            pymongo.results.DeleteResult: The result of the delete operation
        """
        if db is None:
            from app.utils import db as utils_db
            db = utils_db
            
        return db['otp'].delete_one({"email": email})


from pymongo import MongoClient
import os
from dotenv import load_dotenv
from app.Models.User import User

# Load environment variables from .env file
load_dotenv()

# Connect to the MongoDB server
conn = MongoClient(os.getenv("MONGO_URI"))
db = conn["Konnect"]

# Create a dummy user
dummy_user = User(
    name="Dummy User",
    roll_number= '1234',
    password= '1234',
    email='dummy@gmail.com',
    role= 'Student',
    public_key= '1234',
    profile_pic = '1234',
    is_online = False
)

dummy_user.to_db(db)

print("Dummy user added successfully.")

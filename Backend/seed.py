from pymongo import MongoClient
import os
from dotenv import load_dotenv
from app.Models.User import User
from app.Models.Group import Group

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

# Create all the required groups
# Years of admission
years = ['2021', '2022', '2023', '2024']
# Departments
departments = ['ECE', 'CSE', 'CSY', 'AI&DS']
# Batches per year
batches_per_year = 3

# Create year groups
for year in years:
    Group(name=year, description=f"Students admitted in {year}").save(db)
    print(f"Created group for year {year}")
    
    # Create batch groups for each year
    for batch in range(1, batches_per_year + 1):
        batch_name = f"{year}-Batch-{batch}"
        Group(name=batch_name, description=f"Batch {batch} of {year}").save(db)
        print(f"Created group {batch_name}")
    
    # Create department groups for each year
    for dept in departments:
        dept_name = f"{year}-{dept}"
        Group(name=dept_name, description=f"{dept} students of {year}").save(db)
        print(f"Created group {dept_name}")

# Create college-wide group
Group(name="IIIT-Kottayam", description="All students of IIIT Kottayam").save(db)
print("Created college-wide group IIIT-Kottayam")

print("All required groups created successfully.")

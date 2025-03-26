from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import pymongo
import os
from dotenv import load_dotenv
from flask import jsonify, make_response
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import base64
from app.Models.Group import Group
from app.Models.GroupMembership import GroupMembership
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def init_dadabase():
    """
    Initializes the database connection using environment variables.

    This function loads environment variables from a .env file, retrieves the MongoDB
    connection URI and database name, and establishes a connection to the MongoDB
    server. It returns a reference to the specified database.

    Returns:
        pymongo.database.Database: A reference to the MongoDB database.
    """
    load_dotenv()
    connection_uri = os.getenv("MONGO_URI")
    connection_uri = connection_uri.lstrip('\"')
    conn = pymongo.MongoClient(connection_uri)
    db_name = os.getenv("DB_NAME")
    db = conn[db_name]
    return db

db = init_dadabase()  # Database object for operations

# Key paths
KEYS_DIR = "keys"
PRIVATE_KEY_PATH = os.path.join(KEYS_DIR, "private_key.pem")
PUBLIC_KEY_PATH = os.path.join(KEYS_DIR, "public_key.pem")

# Ensure the keys directory exists
os.makedirs(KEYS_DIR, exist_ok=True)

def generate_keys():
    """
    Generate RSA key pair and store them in files if not already stored.

    This function checks if the private and public key files exist at the specified paths.
    If either of the files does not exist, it generates a new RSA key pair with a public
    exponent of 65537 and a key size of 2048 bits. The private key is saved in PKCS8 format
    without encryption, and the public key is saved in SubjectPublicKeyInfo format.

    Raises:
        OSError: If there is an error writing the key files to disk.
    """
    """Generate RSA key pair and store them in files if not already stored."""
    if not os.path.exists(PRIVATE_KEY_PATH) or not os.path.exists(PUBLIC_KEY_PATH):
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        public_key = private_key.public_key()

        with open(PRIVATE_KEY_PATH, "wb") as private_file:
            private_file.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))

        with open(PUBLIC_KEY_PATH, "wb") as public_file:
            public_file.write(public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ))


def get_private_key():
    """
    Load the private key from the specified file path.

    Returns:
        cryptography.hazmat.primitives.asymmetric.rsa.RSAPrivateKey: The loaded private key.

    Raises:
        FileNotFoundError: If the private key file does not exist.
        ValueError: If the private key file is invalid or cannot be loaded.
    """
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )

def get_public_key_pem():
    """
    Reads a PEM-encoded public key from a file and returns it.

    Returns:
        cryptography.hazmat.primitives.asymmetric.rsa.RSAPublicKey: The loaded public key.

    Raises:
        FileNotFoundError: If the file specified by PUBLIC_KEY_PATH does not exist.
        ValueError: If the file content is not a valid PEM-encoded public key.
    """
    with open(PUBLIC_KEY_PATH, "rb") as key_file:
        return serialization.load_pem_public_key(key_file.read())

def public_key():
    return get_public_key_pem().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()

# Generate keys if not present
generate_keys()

def decrypt_RSA(ciphertext:str):
    """
    Decrypts the given ciphertext using the private key and PKCS1v15 padding.

    Args:
        ciphertext (bytes): The encrypted data to be decrypted.

    Returns:
        str: The decrypted plaintext as a string.
    """
    private_key = get_private_key()
    plaintext = private_key.decrypt(
        ciphertext,
        padding.PKCS1v15()
    )
    return plaintext.decode("utf-8")

def handle_options():
    """
    Handle CORS preflight OPTIONS requests by returning appropriate headers.
    
    Returns:
        Response: A Flask response with CORS headers set
    """
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-TOKEN, X-Requested-With")
    response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response

internal_key = os.getenv("AES_KEY_INTERNAL") 
external_key = os.getenv("AES_KEY_EXTERNAL")  # Fixed typo from 'extenal_key'

def encrypt_AES_CBC(plain_text, key_str=internal_key):
    # Check if plain_text is already bytes, otherwise encode it
    text_to_encrypt = plain_text if isinstance(plain_text, bytes) else plain_text.encode()
    
    # Decode the base64-encoded key to get raw bytes
    key = base64.b64decode(key_str)
    
    # Generate a random 16-byte initialization vector
    iv = get_random_bytes(16)
    
    # Create a new AES cipher object with the key and IV
    cipher = AES.new(key, AES.MODE_CBC, iv)
    
    # Encrypt the padded plaintext
    encrypted_bytes = cipher.encrypt(pad(text_to_encrypt, AES.block_size))
    
    # Concatenate the IV and ciphertext and encode as base64
    encrypted_message = base64.b64encode(iv + encrypted_bytes).decode('utf-8')
    
    return encrypted_message

def decrypt_AES_CBC(encrypted_text, key_str=internal_key):
    key = base64.b64decode(key_str)
    encrypted_data = base64.b64decode(encrypted_text)
    iv = encrypted_data[:16]  # Extract IV
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_bytes = unpad(cipher.decrypt(encrypted_data[16:]), AES.block_size)
    return decrypted_bytes.decode()

def encryptRSA(plaintext: str, key: str) -> str:
    """
    Encrypts the given plaintext using the public key and PKCS1v15 padding.

    Args:
        plaintext (str): The plaintext data to be encrypted.
        key (str): The public key to encrypt the data with.

    Returns:
        str: The encrypted ciphertext encoded in base64.
    """
    public_key = serialization.load_pem_public_key(
        key.encode()
    )
    ciphertext = public_key.encrypt(
        plaintext.encode(),
        padding.PKCS1v15()
    )
    return base64.b64encode(ciphertext).decode()

def get_external_key():
    return external_key

def assign_user_to_groups(roll_number, db):
    """
    Assign a user to appropriate groups based on their roll number.
    
    The roll number format is YYYY(BCY/BEC/BCS/BCD)XXXX where:
    - YYYY: Year of admission
    - BCY/BEC/BCS/BCD: Branch code
    - XXXX: 4-digit number (last digit determines batch)
    
    Args:
        roll_number (str): The student's roll number
        db: MongoDB database connection
        
    Returns:
        list: List of group names the user was added to
    """
    if len(roll_number) < 9:
        print(f"Invalid roll number format: {roll_number}")
        return []
    
    # Extract year, branch information
    year = roll_number[:4]
    branch_code = roll_number[4:7]
    
    # Calculate batch based on last digit mod 3
    last_digit = int(roll_number[-1])
    batch_mapping = {
        0: '3',
        1: '1',
        2: '2'
    }
    batch_number = batch_mapping[last_digit % 3]
    
    # Map branch codes to department names
    branch_mapping = {
        'BCY': 'CSY',
        'BEC': 'ECE',
        'BCS': 'CSE',
        'BCD': 'AI&DS'
    }
    
    # Get the department name from the branch code
    department = branch_mapping.get(branch_code, 'Unknown')
    
    # List of groups to add the user to
    groups_to_add = [
        year,                   # Year group
        f"{year}-Batch-{batch_number}", # Year-Batch group
        f"{year}-{department}", # Year-Department group
        "IIIT-Kottayam"        # College-wide group
    ]
    
    added_groups = []
    
    # Add the user to each group
    for group_name in groups_to_add:
        group = Group.find_by_name(group_name, db)
        if group:
            GroupMembership(
                roll_number=roll_number,
                group_id=str(group._id),
                is_admin=False
            ).save(db)
            added_groups.append(group_name)
        else:
            print(f"Group {group_name} not found")
    
    return added_groups

def send_email(recipient_email, otp):
    """
    Send an email with the OTP to the specified recipient.
    
    Args:
        recipient_email (str): The email address of the recipient
        otp (str): The OTP to be sent
        
    Returns:
        bool: True if the email was sent successfully, False otherwise
        
    Raises:
        Exception: If there is an error sending the email
    """
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")
    
    if not sender_email or not sender_password:
        print("Email credentials not configured in environment variables")
        return False
    
    # Create the email message
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = "Your OTP for Konnect Registration"
    
    # Email body - Updated to reflect 15-minute expiration
    body = f"""
    <html>
    <body>
        <h2>Your Verification Code</h2>
        <p>Hello,</p>
        <p>Your one-time password (OTP) for Konnect registration is:</p>
        <h1 style="color: #4285f4; font-size: 32px;">{otp}</h1>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <p>Regards,<br>Konnect Team</p>
    </body>
    </html>
    """
    
    # Attach the body as HTML
    message.attach(MIMEText(body, "html"))
    
    try:
        # Connect to the SMTP server
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()  # Secure the connection
        
        # Login to the email account
        server.login(sender_email, sender_password)
        
        # Send the email
        server.send_message(message)
        
        # Close the connection
        server.quit()
        
        print(f"OTP email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False
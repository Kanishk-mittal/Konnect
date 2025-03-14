from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import pymongo
import os
from dotenv import load_dotenv
from flask import jsonify
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import base64

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
    response = jsonify({"message": "CORS preflight response"})
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "X-Requested-With, Content-Type, X-CSRF-TOKEN"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response, 200

internal_key = os.getenv("AES_KEY_INTERNAL")  
extenal_key = os.getenv("AES_KEY_EXTERNAL")

def encrypt_AES_CBC(plain_text,key=internal_key):
    KEY=base64.b64decode(key)
    iv = get_random_bytes(16)  # Generate random IV
    cipher = AES.new(KEY, AES.MODE_CBC, iv)
    encrypted_bytes = cipher.encrypt(pad(plain_text.encode(), AES.block_size))
    return base64.b64encode(iv + encrypted_bytes).decode()  # Encode IV + ciphertext

def decrypt_AES_CBC(encrypted_text,key=internal_key):
    KEY=base64.b64decode(key)
    encrypted_data = base64.b64decode(encrypted_text)
    iv = encrypted_data[:16]  # Extract IV
    cipher = AES.new(KEY, AES.MODE_CBC, iv)
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
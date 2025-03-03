import base64
from flask import request, jsonify, make_response, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
import pymongo
import os
from dotenv import load_dotenv

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

# Initialize the blueprint
main_bp = Blueprint("main", __name__)

#TODO: Move the key generation to a separate file and store it persistently but this is also fine for devlopment phase
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)
public_key = private_key.public_key()

def get_public_key_pem():
    """
    Retrieve the public key in PEM format.

    This function returns the public key encoded in PEM format as a string.
    The public key is serialized using the SubjectPublicKeyInfo format.

    Returns:
        str: The public key in PEM format.
    """
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()

def decrypt(ciphertext):
    """
    Decrypts the given ciphertext using the private key and PKCS1v15 padding.

    Args:
        ciphertext (bytes): The encrypted data to be decrypted.

    Returns:
        str: The decrypted plaintext as a string.
    """
    return private_key.decrypt(
        ciphertext,
        padding.PKCS1v15()
    ).decode()


@main_bp.route("/publicKey", methods=["POST"])
def get_public_key():
    """
        Endpoint to get the public key for sharing login details.

        This endpoint is used by the frontend to retrieve the public key in PEM format.
        It responds to POST requests with a JSON object containing the public key.

        Returns:
            JSON: A JSON object with the public key.
    """
    return jsonify({"public_key": get_public_key_pem()})

@main_bp.route("/login", methods=["POST","OPTIONS"])
def login():
    """
    Handle user login requests.
    This function manages both CORS preflight requests and actual login attempts.
    For CORS preflight requests, it returns appropriate headers to allow cross-origin requests.
    For login attempts, it decodes and decrypts the provided credentials, verifies them against the database,
    and if valid, creates an access token and sets it as a cookie in the response.
    Returns:
        Response: A Flask response object with appropriate headers and cookies set.
    Raises:
        401 Unauthorized: If the provided credentials are invalid.
    """
    if request.method == "OPTIONS":  # to manage CORS preflight requests (please do not touch even a single character of this block)
        print("Option request received")
        response = jsonify({"message": "CORS preflight response"})
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "X-Requested-With, Content-Type"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        print(response.headers)
        return response, 200

    data = request.get_json()

    # Decode from Base64 instead of hex
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    
    # Decrypt the data
    roll = decrypt(encrypted_roll)
    password = decrypt(encrypted_password)

    # Check if the user exists and the password is correct by matching the hashes
    user = db.users.find_one({"roll_number": roll})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"msg": "Invalid credentials"}), 401
    

    # Create an access token and setting it as cookie
    access_token = create_access_token(identity=roll)
    response = make_response(jsonify({"msg": "Login successful"}))
    response.set_cookie(
        "access_token_cookie",
        access_token,
        httponly=True,
        secure=True,
        samesite="None"
    )
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response


# TODO :Check these routes
@main_bp.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"msg": "Logout successful"}))
    response.set_cookie("access_token_cookie", "", expires=0)
    return response

@main_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify(logged_in_as=current_user)

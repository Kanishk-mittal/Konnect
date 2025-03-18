import base64
from flask import request, jsonify, make_response, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_csrf_token
from app.utils import db, handle_options, public_key, decrypt_RSA, encryptRSA, external_key, get_external_key
from app.Models.User import User

# Initialize the blueprint
main_bp = Blueprint("main", __name__)

@main_bp.route("/publicKey", methods=["POST"])
def get_public_key():
    """
        Endpoint to get the public key for sharing login details.

        This endpoint is used by the frontend to retrieve the public key in PEM format.
        It responds to POST requests with a JSON object containing the public key.

        Returns:
            JSON: A JSON object with the public key.
    """
    return jsonify({"public_key": public_key()})


# TODO: user will send a public key encrypt AES Key using that public key and send it to user as he needs it to decrypt his own private key
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
    if request.method == "OPTIONS":  # to manage CORS preflight requests
        return handle_options()

    data = request.get_json()

    # Decode from Base64 instead of hex
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    user_public_key=data["pyblicKey"]
    
    # Decrypt the data
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)

    isVerified=User.verify(roll, password, db)
    
    if not isVerified:
        return jsonify({"msg": "Invalid credentials"}), 401

    # Create an access token and setting it as cookie
    access_token = create_access_token(identity=roll)
    # Use the external key consistently
    response = make_response(jsonify({"msg": "Login successful","key":encryptRSA(external_key, user_public_key)}))
    response.set_cookie(
        "access_token_cookie",
        access_token,
        httponly=True,
        secure=True,
        samesite="None"
    )
    # Create csrf token
    csrf_token = get_csrf_token(access_token)
    response.set_cookie(
        "csrf_access_token",  # CSRF token for frontend
        csrf_token,
        httponly=False,  # This must be readable by JavaScript
        secure=True,
        samesite="None"
    )
    return response

@main_bp.route("/register", methods=["POST","OPTIONS"])
def register():
    """
    Handle user registration requests.
    
    This function processes registration requests by:
    1. Decrypting the encrypted user information sent from the frontend
    2. Creating a new user in the database
    3. Creating a JWT access token for the new user
    4. Sending back an encrypted AES key that the user can use to encrypt/decrypt data on the client side
    
    Returns:
        Response: A Flask response object with appropriate headers, cookies, and encrypted AES key.
        
    Raises:
        409 Conflict: If a user with the same roll number already exists.
    """
    if request.method == "OPTIONS":
        return handle_options()
    
    data = request.get_json()
    
    # Decode all encrypted data from base64
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    encrypted_name = base64.b64decode(data["name"])
    encrypted_email = base64.b64decode(data["email"])
    user_public_key = data["publicKey"]
    
    # Decrypt the data using our private key
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)
    name = decrypt_RSA(encrypted_name)
    email = decrypt_RSA(encrypted_email)

    # Create a new user instance
    user = User(
        name=name,
        roll_number=roll,
        password=password,
        email=email,
        role='Student',
        public_key=user_public_key.encode(),
        profile_pic=None,
        is_online=True
    )
    
    # Check if user already exists
    if not user.check_unique(db):
        response = make_response(jsonify({'msg': 'Account already exists'}), 409)
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Save to database
    user.to_db(db)
    
    # Create an access token and set it as cookie
    access_token = create_access_token(identity=roll)
    
    # Get the external AES key and encrypt it using the user's public key
    # Make sure we're using the external key for user communication
    encrypted_key = encryptRSA(external_key, user_public_key)
    
    response = make_response(jsonify({"msg": "Registration successful", "key": encrypted_key}))
    response.set_cookie(
        "access_token_cookie",
        access_token,
        httponly=True,
        secure=True,
        samesite="None"
    )
    
    # Create csrf token
    csrf_token = get_csrf_token(access_token)
    response.set_cookie(
        "csrf_access_token",
        csrf_token,
        httponly=False,
        secure=True,
        samesite="None"
    )
    return response

@main_bp.route("/logout", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def logout():
    if request.method == "OPTIONS":
        return handle_options()
    
    # Get the current user identity
    current_user = get_jwt_identity()
    
    # Create a response with success message
    response = make_response(jsonify({"msg": "Logout successful", "user": current_user}))
    
    # Clear cookie by setting it to empty and expiring it
    response.set_cookie("access_token_cookie", "", expires=0, httponly=True, secure=True, samesite="None")
    
    # Also clear the CSRF token cookie
    response.set_cookie("csrf_access_token", "", expires=0, secure=True, samesite="None")
    
    return response

@main_bp.route("/protected", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def protected():
    if request.method == "OPTIONS":
        return handle_options()
    
    # Get the identity of the current user
    current_user = get_jwt_identity()
    
    # Check if the user exists in the database
    user = User.from_db(current_user, db)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Create a response with the user information
    response = make_response(jsonify({
        "logged_in_as": current_user,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "status": "authenticated"
    }), 200)
    
    return response

@main_bp.route("/get_AES_key", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def get_AES_key():
    if request.method == "OPTIONS":
        return handle_options()
    identity=get_jwt_identity()
    user=User.from_db(identity,db)
    encrypted_key=user.get_AES_key()
    response=make_response(jsonify({'key':encrypted_key}),200)
    return response

@main_bp.route("/check_roll", methods=["POST","OPTIONS"])
def check_roll():
    """
    Check if a roll number already exists in the database.
    
    This endpoint allows the frontend to check if a roll number is available
    before attempting full registration.
    
    Returns:
        JSON: A response indicating whether the roll number exists
    """
    if request.method == "OPTIONS":
        return handle_options()
    
    data = request.get_json()
    encrypted_roll = base64.b64decode(data["roll"])
    roll = decrypt_RSA(encrypted_roll)
    
    # Create a temporary User object just to check uniqueness
    temp_user = User(
        name="Temp",
        roll_number=roll,
        password="temp_password",
        email="temp@example.com",
        role="Student"
    )
    
    is_unique = temp_user.check_unique(db)
    
    return jsonify({"available": is_unique}), 200
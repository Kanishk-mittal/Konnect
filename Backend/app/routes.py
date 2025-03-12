import base64
from flask import request, jsonify, make_response, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_csrf_token
from app.utils import db, handle_options, public_key, decrypt_RSA,key_env
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
    
    # Decrypt the data
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)

    isVerified=User.verify(roll, password, db)
    
    if not isVerified:
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
    # Create csrf token
    csrf_token = get_csrf_token(access_token)
    response.set_cookie(
        "csrf_access_token",  # CSRF token for frontend
        csrf_token,
        httponly=False,  # This must be readable by JavaScript
        secure=True,
        samesite="None"
    )
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# TODO: Work on register route
@main_bp.route("/register", methods=["POST","OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    encrypted_name = base64.b64decode(data["name"])
    public_key=base64.b64decode(data["public_key"])
    email=base64.b64decode(data["email"])
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)
    name = decrypt_RSA(encrypted_name)
    email=decrypt_RSA(email)

    user = User(
        name=name,
        roll_number=roll,
        password=password,
        email=email,
        role='Student',
        public_key=public_key,
        profile_pic=None,
        is_online=True
        )
    if not user.check_unique():
        response=make_response(jsonify({'msg':'Account already exist'}))
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    user.to_db(db)
    # Create an access token and setting it as cookie
    access_token = create_access_token(identity=roll)
    encrypted_key=user.get_AES_key()
    response = make_response(jsonify({"msg": "Login successful","key":encrypted_key}))
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
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response



@main_bp.route("/logout", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def logout():
    if request.method == "OPTIONS":
        return handle_options()
    response = make_response(jsonify({"msg": "Logout successful"}))
    response.set_cookie("access_token_cookie", "", expires=0)
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@main_bp.route("/protected", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def protected():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    response=make_response(jsonify(logged_in_as=current_user),200)
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@main_bp.route("/get_AES_key", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def get_AES_key():
    if request.method == "OPTIONS":
        return handle_options()
    identity=get_jwt_identity()
    user=User.from_db(identity,db)
    encrypted_key=user.get_AES_key()
    response=make_response(jsonify({'key':encrypted_key},200))
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response
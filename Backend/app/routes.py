import base64
from flask import request, jsonify, make_response, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_csrf_token
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import get_public_key_pem, db, decrypt, handle_options, public_key

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

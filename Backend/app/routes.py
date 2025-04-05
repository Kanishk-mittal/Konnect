import base64
from flask import request, jsonify, make_response, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_csrf_token
from app.utils import db, handle_options, public_key, decrypt_RSA, encryptRSA, external_key, assign_user_to_groups, send_email, decrypt_AES_CBC
from app.Models.User import User
from app.Models.OTP import OTP
from . import socketio
from flask_socketio import emit, join_room
from werkzeug.security import generate_password_hash

main_bp = Blueprint("main", __name__)

@main_bp.route("/publicKey", methods=["POST"])
def get_public_key():
    return jsonify({"public_key": public_key()})

@main_bp.route("/login", methods=["POST","OPTIONS"])
def login():
    if request.method == "OPTIONS":  
        return handle_options()
    data = request.get_json()
    if "roll" not in data or "password" not in data or "publicKey" not in data:
        return jsonify({"msg": "Missing required fields"}), 400
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    user_public_key = data["publicKey"]  
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)
    isVerified = User.verify(roll, password, db)
    if not isVerified:
        return jsonify({"msg": "Invalid credentials"}), 401
    access_token = create_access_token(identity=roll)
    response = make_response(jsonify({"msg": "Login successful","key":encryptRSA(external_key, user_public_key)}))
    response.set_cookie(
        "access_token_cookie",
        access_token,
        httponly=True,
        secure=True,
        samesite="None"
    )
    csrf_token = get_csrf_token(access_token)
    response.set_cookie(
        "csrf_access_token",  
        csrf_token,
        httponly=False,  
        secure=True,
        samesite="None"
    )
    return response

@main_bp.route("/register", methods=["POST","OPTIONS"])
def register():
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    encrypted_name = base64.b64decode(data["name"])
    encrypted_email = base64.b64decode(data["email"])
    user_public_key = data["publicKey"]
    otp_input = base64.b64decode(data["otp"])
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)
    name = decrypt_RSA(encrypted_name)
    email = decrypt_RSA(encrypted_email)
    otp= decrypt_RSA(otp_input)
    
    # Validate that email contains transformed roll number
    def transform_roll_number(roll):
        if not roll:
            return ''
        # 1. Remove first two characters
        transformed = roll[2:]
        # 2. Remove all 0's
        transformed = transformed.replace('0', '')
        # 3. Convert to lowercase
        transformed = transformed.lower()
        return transformed
    
    transformed_roll = transform_roll_number(roll)
    #TODO enable this check
    # if not transformed_roll or transformed_roll not in email.lower():
    #     return make_response(jsonify({'msg': 'Email must contain your roll number identifier. Please use your own college ID.'}), 400)
    
    if not OTP.verify(db, email, otp):
        return make_response(jsonify({'msg': 'Invalid or expired OTP. Please request a new OTP.'}), 400)
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
    if not user.check_unique(db):
        return make_response(jsonify({'msg': 'Account already exists'}), 409)
    user.to_db(db)
    assigned_groups = assign_user_to_groups(roll, db)
    access_token = create_access_token(identity=roll)
    encrypted_key = encryptRSA(external_key, user_public_key)
    response = make_response(jsonify({"msg": "Registration successful","key": encrypted_key}))
    response.set_cookie(
        "access_token_cookie",
        access_token,
        httponly=True,
        secure=True,
        samesite="None"
    )
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
    current_user = get_jwt_identity()
    response = make_response(jsonify({"msg": "Logout successful", "user": current_user}))
    response.set_cookie("access_token_cookie", "", expires=0, httponly=True, secure=True, samesite="None")
    response.set_cookie("csrf_access_token", "", expires=0, secure=True, samesite="None")
    return response

@main_bp.route("/user_details", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def user_details():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    response = make_response(jsonify({
        "logged_in_as": current_user,
        "name": user.name,
    }), 200)
    return response

@main_bp.route("/get_user_key", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def get_user_key():
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    roll = data.get("roll")
    requester_identity = get_jwt_identity()
    if not roll:
        return jsonify({"error": "Roll number is required"}), 400
    if not isinstance(roll, str):
        return jsonify({"error": "Roll number must be a string"}), 400
    target_user = User.from_db(roll, db)
    if not target_user:
        return jsonify({"error": f"User with roll number {roll} not found"}), 404
    if not target_user.public_key:
        return jsonify({"error": f"Public key for user {roll} is not available"}), 404
    public_key = target_user.public_key
    if isinstance(public_key, bytes):
        public_key = public_key.decode()
    return jsonify({
        "key": public_key, 
        "user_roll": roll  
    }), 200

@main_bp.route("/get_group_keys", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def get_group_keys():
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    group_id = data.get("group_id")
    requester_identity = get_jwt_identity()
    if not group_id:
        return jsonify({"error": "Group ID is required"}), 400
    from app.Models.Group import Group
    group = Group.find_by_id(group_id, db)
    if not group:
        return jsonify({"error": f"Group with ID {group_id} not found"}), 404
    from app.Models.GroupMembership import GroupMembership
    if not GroupMembership.is_member(requester_identity, group_id, db):
        return jsonify({"error": "You do not have permission to access this group's keys"}), 403
    members = GroupMembership.get_group_members(group_id, db)
    if not members:
        return jsonify({"message": "No members found in this group", "keys": []}), 200
    member_keys = []
    for member in members:
        user = User.from_db(member.roll_number, db)
        if user and user.public_key:
            public_key = user.public_key
            if isinstance(public_key, bytes):
                public_key = public_key.decode()
            member_keys.append({
                "roll_number": member.roll_number,
                "public_key": public_key
            })
    return jsonify({
        "group_name": group.name,
        "group_id": group_id,
        "keys": member_keys
    }), 200

@main_bp.route("/get_user_groups", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def get_user_groups():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user_groups = user.get_user_groups(db)
    return jsonify({
        "user": current_user,
        "groups": user_groups
    }), 200

@main_bp.route("/get_user_groups_with_keys", methods=["GET", "OPTIONS"])
@jwt_required(locations='cookies')
def get_user_groups_with_keys():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    from app.Models.GroupMembership import GroupMembership
    from app.Models.Group import Group
    memberships = GroupMembership.get_user_groups(current_user, db)
    if not memberships:
        return jsonify({
            "user": current_user,
            "groups": []
        }), 200
    groups_with_keys = []
    for membership in memberships:
        group_id = membership.group_id
        group = Group.find_by_id(group_id, db)
        if not group:
            continue
        members = GroupMembership.get_group_members(group_id, db)
        member_keys = []
        for member in members:
            member_user = User.from_db(member.roll_number, db)
            if member_user and member_user.public_key:
                public_key = member_user.public_key
                if isinstance(public_key, bytes):
                    public_key = public_key.decode()
                member_keys.append({
                    "roll_number": member.roll_number,
                    "public_key": public_key,
                    "role": member.role
                })
        groups_with_keys.append({
            "id": group_id,
            "name": group.name,
            "description": group.description if hasattr(group, 'description') else None,
            "role": membership.role,
            "members": member_keys,
            "member_count": len(member_keys)
        })
    return jsonify({
        "user": current_user,
        "groups": groups_with_keys
    }), 200

@main_bp.route("/otp", methods=["POST", "OPTIONS"])
def request_otp():
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    email = data.get("email")
    if not email:
        roll_number = data.get("roll_number")
        if not roll_number:
            return jsonify({"err": "Email or roll number is required"}), 400
        user = User.from_db(roll_number, db)
        email = user.email if user else None
        if not email:
            return jsonify({"err": "User not found"}), 404
    otp_obj = OTP(email)
    OTP.delete_by_email(email, db)
    otp_obj.save(db)
    email_sent = send_email(recipient_email=email, otp=otp_obj.otp)
    if not email_sent:
        return jsonify({"err": "Failed to send OTP email"}), 500
    return jsonify({
        "msg": "OTP sent successfully",
        "expires_at": otp_obj.expires_at
    }), 200

# # Add these new routes for messaging functionality
# @main_bp.route("/get_messages", methods=["POST", "OPTIONS"])
# @jwt_required(locations='cookies')
# def get_messages():
#     if request.method == "OPTIONS":
#         return handle_options()
    
#     current_user = get_jwt_identity()
#     user = User.from_db(current_user, db)
#     if not user:
#         return jsonify({"error": "User not found"}), 404
    
#     # Set user as online when they fetch messages
#     user.is_online = True
#     user.update_db(db)
    
#     from app.Models.Messages import Messages
    
#     # Get direct messages
#     messages = []
    
#     # Get messages from database
#     # For each conversation partner, get up to 50 messages
#     conversations = db.temp_messages.distinct("sender", {"receiver": current_user})
#     for sender in conversations:
#         if isinstance(sender, bytes):
#             try:
#                 sender = decrypt_AES_CBC(sender)
#             except:
#                 continue
#         conversation_messages = Messages.get_conversation(current_user, sender, db, 50)
#         messages.extend(conversation_messages)
    
#     # Also get received messages
#     received_messages = db.temp_messages.find({"receiver": current_user}).limit(100)
#     for msg_data in received_messages:
#         msg = Messages.from_db(msg_data)
#         if msg:
#             messages.append(msg)
    
#     # Convert messages to dict format for response
#     message_dicts = [msg.to_dict() for msg in messages]
    
#     return jsonify({
#         "user": current_user,
#         "messages": message_dicts
#     }), 200

# @main_bp.route("/set_offline", methods=["POST", "OPTIONS"])
# def set_offline():
#     if request.method == "OPTIONS":
#         return handle_options()
    
#     data = request.get_json()
#     roll_number = data.get("roll_number")
    
#     if not roll_number:
#         return jsonify({"error": "Roll number is required"}), 400
    
#     updates = {"is_online": False}
#     result = User.update_user_details(roll_number, updates, db)

#     if result.get("modified_count", 0) > 0:
#         return jsonify({"message": "Status set to offline"}), 200
#     else:
#         return jsonify({"error": "Failed to update status"}), 500

# @main_bp.route("/set_online", methods=["POST", "OPTIONS"])
# @jwt_required(locations='cookies')
# def set_online():
#     if request.method == "OPTIONS":
#         return handle_options()

#     current_user = get_jwt_identity()
#     updates = {"is_online": True}
#     result = User.update_user_details(current_user, updates, db)

#     if result.get("modified_count", 0) > 0:
#         return jsonify({"message": "Status set to online"}), 200
#     else:
#         return jsonify({"error": "Failed to update status"}), 500

@main_bp.route("/get_users", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def get_users():
    if request.method == "OPTIONS":
        return handle_options()
    
    current_user = get_jwt_identity()
    
    # Get all users
    all_users = User.get_all_users(db)
    
    # Filter out the current user
    users = [user for user in all_users if user["roll_number"] != current_user]
    
    return jsonify({
        "users": users
    }), 200


@socketio.on('join')
def on_join(data):
    """
    Handle client joining a socket room
    Args:
        data (dict): Contains the room to join
    """
    try:
        room = data.get('room')
        sid = request.sid
        
        if room:
            join_room(room)
    except Exception as e:
        pass

@socketio.on('send_message')
def receive_message(data):
    try:
        # Decrypt receiver info since it's the only one needed for routing
        receiver = data.get('receiver')
        if not receiver:
            emit('message_error', {'error': 'No receiver specified'})
            return
            
        # Decrypt the receiver using the external key
        decrypted_receiver = decrypt_AES_CBC(receiver, key_str=external_key)
        
        # Check if the receiver is online before emitting
        # is_receiver_online = User.is_online(decrypted_receiver, db)
        is_receiver_online = True   # setting it static since updating it is creating trouble 
        
        if is_receiver_online:
            # Emit to the specific room (user) if they're online
            emit('receive_message', data, room=decrypted_receiver)
        else:
            # Only store message in database for offline delivery
            from app.utils import save_message
            save_message(data)
        
        # Always emit confirmation to sender
        emit('message_sent', {
            'status': 'delivered' if is_receiver_online else 'stored',
            'timestamp': data.get('timestamp')
        })
    except Exception as e:
        emit('message_error', {'error': str(e)})

# Simplified connection event handlers
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    
@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid

@main_bp.route("/server_key", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def get_server_key():
    if request.method == "OPTIONS":
        return handle_options()
    
    data = request.get_json()
    user_public_key = data.get("publicKey")
    
    if not user_public_key:
        return jsonify({"error": "Public key is required"}), 400
    
    # Get the current user identity from JWT
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Encrypt the external key with the user's public key
    encrypted_key = encryptRSA(external_key, user_public_key)
    
    return jsonify({
        "key": encrypted_key
    }), 200

@main_bp.route("/get_profile", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def get_profile():
    if request.method == "OPTIONS":
        return handle_options()
    
    # Get current user identity directly from JWT
    current_user_roll = get_jwt_identity()
    
    # Get the user from the database
    user = User.from_db(current_user_roll, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Convert profile picture to base64 if it exists
    profile_pic = None
    if user.profile_pic:
        if isinstance(user.profile_pic, bytes):
            profile_pic = base64.b64encode(user.profile_pic).decode('utf-8')
    
    # Construct the response
    profile_data = {
        "name": user.name,
        "roll_number": user.roll_number,
        "email": user.email,
        "role": user.role,
        "profile_pic": profile_pic,
        "is_online": user.is_online,
        "description": user.description
    }
    
    return jsonify(profile_data), 200

@main_bp.route("/get_credentials", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def get_credentials():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    credentials = user.get_credentials()
    return jsonify(credentials), 200

@main_bp.route("/update_profile", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def update_profile():
    if request.method == "OPTIONS":
        return handle_options()
    
    current_user = get_jwt_identity()
    data = request.get_json()
    
    # First decrypt the AES key using the server's private key
    encrypted_aes_key = data.get("aesKey")
    if not encrypted_aes_key:
        return jsonify({"error": "Missing encryption key"}), 400
    
    try:
        # JSEncrypt output needs to be base64 decoded before RSA decryption
        encrypted_aes_key = base64.b64decode(encrypted_aes_key)
        aes_key = decrypt_RSA(encrypted_aes_key)
        
        # Prepare updates dictionary - will only contain fields that were sent
        updates = {}
        
        # Only process username if it was included in the request
        if "username" in data:
            updates["name"] = decrypt_AES_CBC(data["username"], key_str=aes_key)
        
        # Only process description if it was included in the request
        if "description" in data:
            updates["description"] = decrypt_AES_CBC(data["description"], key_str=aes_key)
        
        # Handle password change if both fields are provided
        if "newPassword" in data and "otp" in data:
            new_password = decrypt_AES_CBC(data["newPassword"], key_str=aes_key)
            otp = decrypt_AES_CBC(data["otp"], key_str=aes_key)
            
            # Get user to verify email for OTP
            user = User.from_db(current_user, db)
            if not user:
                return jsonify({"error": "User not found"}), 404
                
            # Verify OTP
            if not OTP.verify(db, user.email, otp):
                return jsonify({"error": "Invalid or expired OTP"}), 400
            
            # Add password to updates
            updates["password"] = generate_password_hash(new_password)
        
        # Only proceed if there are actual updates to make
        if not updates:
            return jsonify({"message": "No changes to update"}), 200
            
        # Use the static method to update user details with only the changed fields
        result = User.update_user_details(current_user, updates, db)
        
        # Check if update was successful
        if result.get("modified_count", 0) > 0:
            return jsonify({"message": "Profile updated successfully"}), 200
        else:
            return jsonify({"message": "No changes made to the database"}), 200
            
    except Exception as e:
        import traceback
        traceback.print_exc()  # Print full stack trace for debugging
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500

@main_bp.route("/update_password", methods=["POST", "OPTIONS"])
def update_password():
    if request.method == "OPTIONS":
        return handle_options()
    
    data = request.get_json()
    
    if "roll" not in data or "password" not in data or "otp" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Get encrypted data
    encrypted_roll = base64.b64decode(data["roll"])
    encrypted_password = base64.b64decode(data["password"])
    encrypted_otp = base64.b64decode(data["otp"])
    
    # Decrypt data
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)
    otp = decrypt_RSA(encrypted_otp)
    
    # Find user by roll number
    user = User.from_db(roll, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Verify OTP
    if not OTP.verify(db, user.email, otp):
        return jsonify({"error": "Invalid or expired OTP"}), 400
    
    # Update password
    updates = {"password": generate_password_hash(password)}
    result = User.update_user_details(roll, updates, db)
    
    # Check if update was successful
    if result.get("modified_count", 0) > 0:
        return jsonify({"message": "Password updated successfully"}), 200
    else:
        return jsonify({"error": "Failed to update password"}), 500

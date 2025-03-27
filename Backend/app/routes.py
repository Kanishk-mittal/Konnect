import base64
from flask import request, jsonify, make_response, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_csrf_token
from app.utils import db, handle_options, public_key, decrypt_RSA, encryptRSA, external_key, assign_user_to_groups, send_email, decrypt_AES_CBC
from app.Models.User import User
from app.Models.OTP import OTP
from . import socketio
from flask_socketio import emit, join_room

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
    otp_input = data.get("otp")
    roll = decrypt_RSA(encrypted_roll)
    password = decrypt_RSA(encrypted_password)
    name = decrypt_RSA(encrypted_name)
    email = decrypt_RSA(encrypted_email)
    if not OTP.verify(db, email, otp_input):
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
    print(f"User {roll} assigned to groups: {assigned_groups}")
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

@main_bp.route("/protected", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def protected():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
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
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    encrypted_roll = base64.b64decode(data["roll"])
    roll = decrypt_RSA(encrypted_roll)
    temp_user = User(
        name="Temp",
        roll_number=roll,
        password="temp_password",
        email="temp@example.com",
        role="Student"
    )
    is_unique = temp_user.check_unique(db)
    return jsonify({"available": is_unique}), 200

@main_bp.route("/get_user_key", methods=["POST","OPTIONS"])
@jwt_required(locations='cookies')
def get_user_key():
    if request.method == "OPTIONS":
        return handle_options()
    data = request.get_json()
    roll = data.get("roll")
    requester_identity = get_jwt_identity()
    print(f"User key request: roll={roll}, requested by={requester_identity}")
    if not roll:
        return jsonify({"error": "Roll number is required"}), 400
    if not isinstance(roll, str):
        return jsonify({"error": "Roll number must be a string"}), 400
    target_user = User.from_db(roll, db)
    if not target_user:
        print(f"User with roll {roll} not found in database")
        return jsonify({"error": f"User with roll number {roll} not found"}), 404
    if not target_user.public_key:
        print(f"Public key for user {roll} is not available")
        return jsonify({"error": f"Public key for user {roll} is not available"}), 404
    public_key = target_user.public_key
    if isinstance(public_key, bytes):
        public_key = public_key.decode()
    print(f"Successfully retrieved public key for user {roll}")
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
    print(f"Group keys request: group_id={group_id}, requested by={requester_identity}")
    if not group_id:
        return jsonify({"error": "Group ID is required"}), 400
    from app.Models.Group import Group
    group = Group.find_by_id(group_id, db)
    if not group:
        print(f"Group with ID {group_id} not found")
        return jsonify({"error": f"Group with ID {group_id} not found"}), 404
    from app.Models.GroupMembership import GroupMembership
    if not GroupMembership.is_member(requester_identity, group_id, db):
        print(f"User {requester_identity} is not a member of group {group_id}")
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
    print(f"Successfully retrieved {len(member_keys)} keys for group {group_id}")
    return jsonify({
        "group_name": group.name,
        "group_id": group_id,
        "keys": member_keys
    }), 200

@main_bp.route("/get_user_groups", methods=["GET", "OPTIONS"])
@jwt_required(locations='cookies')
def get_user_groups():
    if request.method == "OPTIONS":
        return handle_options()
    current_user = get_jwt_identity()
    print(f"Getting groups for user: {current_user}")
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user_groups = user.get_user_groups(db)
    print(f"User {current_user} has {len(user_groups)} groups")
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
        return jsonify({"msg": "Email is required"}), 400
    otp_obj = OTP(email)
    OTP.delete_by_email(email, db)
    otp_obj.save(db)
    email_sent = send_email(recipient_email=email, otp=otp_obj.otp)
    if not email_sent:
        return jsonify({"msg": "Failed to send OTP email"}), 500
    return jsonify({
        "msg": "OTP sent successfully",
        "expires_at": otp_obj.expires_at
    }), 200

# Add these new routes for messaging functionality
@main_bp.route("/get_messages", methods=["GET", "OPTIONS"])
@jwt_required(locations='cookies')
def get_messages():
    if request.method == "OPTIONS":
        return handle_options()
    
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    from app.Models.Messages import Messages
    
    # Get direct messages
    messages = []
    
    # Get messages from database
    # For each conversation partner, get up to 50 messages
    conversations = db.temp_messages.distinct("sender", {"receiver": current_user})
    for sender in conversations:
        if isinstance(sender, bytes):
            try:
                sender = decrypt_AES_CBC(sender)
            except:
                continue
        conversation_messages = Messages.get_conversation(current_user, sender, db, 50)
        messages.extend(conversation_messages)
    
    # Also get received messages
    received_messages = db.temp_messages.find({"receiver": current_user}).limit(100)
    for msg_data in received_messages:
        msg = Messages.from_db(msg_data)
        if msg:
            messages.append(msg)
    
    # Convert messages to dict format for response
    message_dicts = [msg.to_dict() for msg in messages]
    
    return jsonify({
        "user": current_user,
        "messages": message_dicts
    }), 200

@main_bp.route("/set_offline", methods=["POST", "OPTIONS"])
@jwt_required(locations='cookies')
def set_offline():
    if request.method == "OPTIONS":
        return handle_options()
    
    current_user = get_jwt_identity()
    user = User.from_db(current_user, db)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update user's online status
    user.is_online = False
    user.update_db(db)
    
    return jsonify({
        "message": "Status set to offline"
    }), 200

@main_bp.route("/get_users", methods=["GET", "OPTIONS"])
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


@socketio.on('send_message')
def receive_message(data):
    try:
        # 1 & 2. Get and decrypt receiver roll number
        receiver = decrypt_AES_CBC(data.get('receiver'))
        sender = decrypt_AES_CBC(data.get('sender'))
        
        # 3. Check if receiver is online
        from app.Models.User import User
        receiver_online = User.is_online(receiver, db)
        
        # 4. If receiver is offline, save to database and return
        if not receiver_online:
            # Save message to database
            from app.Models.Messages import Messages
            new_message = Messages(
                sender=sender,
                receiver=receiver,
                message=data.get('message'),
                aes_key=data.get('aes_key'),
                timestamp=data.get('timestamp')
            )
            new_message.save(db)
            
            # Emit confirmation back to sender
            emit('message_stored', {
                'status': 'stored',
                'receiver': data.get('receiver'),
                'timestamp': data.get('timestamp')
            })
            
            print(f"Message from {sender} to {receiver} stored in database (receiver offline)")
            return
        
        # 5. Set the room as receiver roll number
        room = receiver
        join_room(room)
        
        # 6. Emit message with required attributes
        emit('new_message', {
            'sender': data.get('sender'),
            'message': data.get('message'),
            'key': data.get('aes_key'),
            'timestamp': data.get('timestamp'),
            'group': data.get('group')  # Will be None for DMs
        }, room=room)
        
        print(f"Message from {sender} sent to room: {room}")
        
    except Exception as e:
        print(f"Error processing message: {str(e)}")
        # Emit error to sender only
        emit('message_error', {'error': 'Failed to process message'})


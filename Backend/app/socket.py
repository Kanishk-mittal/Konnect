from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from flask import request

# Initialize SocketIO
socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

# Map of user ID to Socket ID
user_socket_map = {}

@socketio.on('connect')
def handle_connect():
    """
    Handle client connection to the socket server.
    Authenticates the user based on the provided token and adds them to their user-specific room.
    """
    token = request.args.get('token')
    
    if not token:
        # Token not provided
        print("SOCKET ERROR: No token provided for socket connection")
        socketio.disconnect(request.sid)
        return
    
    try:
        # Decode the token to get the user identity
        decoded_token = decode_token(token)
        user_id = decoded_token['sub']
        
        # Add user to a room with their user ID
        join_room(user_id)
        
        # Store mapping of user to socket
        user_socket_map[user_id] = request.sid
        
        # Debug info about connected users
        print(f"SOCKET: User {user_id} connected with socket ID {request.sid}")
        print(f"SOCKET: Active socket connections: {user_socket_map}")
        print(f"SOCKET: Active rooms: {socketio.server.rooms}")
        
        # Update user's online status in the database
        from app.utils import db
        from app.Models.User import User
        
        user = User.from_db(user_id, db)
        if user:
            user.is_online = True
            user.update_db(db)
            print(f"SOCKET: Updated user {user_id} status to online in database")
        
        # Broadcast user's online status to others
        emit('user_status', {
            'roll_number': user_id,
            'status': 'online'
        }, broadcast=True)
        print(f"SOCKET: Broadcasted online status for user {user_id}")
        
    except Exception as e:
        print(f"SOCKET ERROR: Authentication error: {e}")
        socketio.disconnect(request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle client disconnection from the socket server.
    Updates the user's status to offline and removes them from the mapping.
    """
    print(f"SOCKET: Disconnect event received for SID {request.sid}")
    print(f"SOCKET: Current user mappings: {user_socket_map}")
    
    for user_id, sid in list(user_socket_map.items()):  # Use list to avoid modification during iteration
        if sid == request.sid:
            # User found, update online status
            from app.utils import db
            from app.Models.User import User
            
            user = User.from_db(user_id, db)
            if user:
                user.is_online = False
                user.update_db(db)
                print(f"SOCKET: Updated user {user_id} status to offline in database")
            
            # Broadcast user's offline status
            emit('user_status', {
                'roll_number': user_id,
                'status': 'offline'
            }, broadcast=True)
            print(f"SOCKET: Broadcasted offline status for user {user_id}")
            
            # Remove from mapping and room
            leave_room(user_id)
            user_socket_map.pop(user_id, None)
            print(f"SOCKET: User {user_id} disconnected and removed from mappings")
            break
    else:
        print(f"SOCKET WARNING: Could not find a user for SID {request.sid}")

@socketio.on('send_message')
def handle_send_message(data):
    """
    Handle message sending between users.
    When a user sends a message, this function processes it and emits it to the recipient.
    Args:
        data (dict): Contains message details including receiver and content
    """
    token = request.args.get('token')
    if not token:
        print("SOCKET ERROR: No token provided for sending message")
        return
    
    try:
        # Authenticate the sender
        decoded_token = decode_token(token)
        sender_id = decoded_token['sub']
        
        receiver_id = data.get('receiver')
        message_content = data.get('message')
        
        print(f"SOCKET: Received message request from {sender_id} to {receiver_id}")
        if message_content:
            content_preview = message_content[:20] + "..." if len(message_content) > 20 else message_content
            print(f"SOCKET: Message content preview: {content_preview}")
        
        if not receiver_id or not message_content:
            print("SOCKET ERROR: Missing receiver or message content")
            return
        
        # Create and store the message
        from app.Models.Messages import Messages
        from app.utils import db
        
        message = Messages(
            sender=sender_id,
            message=message_content,  # Already encrypted
            receiver=receiver_id,
            group=None
        )
        
        # Store the message
        result = message.to_db(db)
        message.message_id = str(result.inserted_id)
        print(f"SOCKET: Message stored in database with ID {message.message_id}")
        
        # Convert to dictionary for transmission
        message_dict = message.to_dict()
        print(f"SOCKET: Converted message to dict: {message_dict}")
        
        # Is the receiver online?
        is_receiver_connected = receiver_id in user_socket_map
        print(f"SOCKET: Is receiver {receiver_id} connected? {is_receiver_connected}")
        
        # Print all active rooms
        print(f"SOCKET: Available rooms: {socketio.server.rooms}")
        
        # Try to send message directly to the receiver's room
        print(f"SOCKET: Sending message to room: {receiver_id}")
        emit('message', message_dict, room=receiver_id)
        
        # Also send to sender to confirm their message was sent
        print(f"SOCKET: Sending confirmation to sender: {sender_id}")
        emit('message', message_dict, room=sender_id)
        
        # If receiver is not connected, try broadcast with filtering
        if not is_receiver_connected:
            print(f"SOCKET: Receiver not connected, sending broadcast with filter")
            # Special broadcast that includes recipient info for client filtering
            emit('message', {
                **message_dict,
                '_recipients': [sender_id, receiver_id]  # Metadata for client filtering
            }, broadcast=True)
        
        print(f"SOCKET: Message delivery attempt completed for message {message.message_id}")
        
    except Exception as e:
        print(f"SOCKET ERROR: Error sending message: {e}")
        import traceback
        print(f"SOCKET ERROR: Traceback: {traceback.format_exc()}")

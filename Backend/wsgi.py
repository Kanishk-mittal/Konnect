import eventlet
eventlet.monkey_patch()

import os
from app import create_app
from app.socket import socketio

app = create_app()

if __name__ == "__main__":
    # Use port 5000 for both HTTP and WebSocket traffic
    port = 5000
    
    print(f"Starting server with WebSocket support on port {port}")
    
    try:
        # Use socketio.run to handle both HTTP and WebSocket on the same port
        socketio.run(
            app, 
            host='0.0.0.0',
            port=port,
            debug=True
        )
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"ERROR: Port {port} is already in use. Try manually stopping the process using this port.")
            print(f"On Linux, you can use: sudo fuser -k {port}/tcp")
            # Try to provide helpful message about finding the process using the port
            print(f"You can find which process is using the port with: sudo lsof -i :{port}")
        else:
            print(f"ERROR: Error starting server: {e}")
        exit(1)
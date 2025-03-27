from app import create_app,socketio

app = create_app()


if __name__ == "__main__":
    port = 5000
    
    print("Starting server on port", port)
    socketio.run(app, port=port, host="0.0.0.0", debug=True)

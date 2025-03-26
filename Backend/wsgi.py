from app import create_app
from flask_cors import CORS

app = create_app()
# Configure CORS properly with explicit settings for better clarity and security
CORS(app, 
     origins=["http://localhost:5173"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "X-CSRF-TOKEN", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
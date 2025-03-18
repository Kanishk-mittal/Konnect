from app import create_app
from flask_cors import CORS

app = create_app()
# Configure CORS properly - simplify and correct the settings
CORS(app, 
     origins="http://localhost:5173", 
     supports_credentials=True)

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
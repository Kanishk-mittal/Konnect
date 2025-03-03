from app import create_app
from flask_cors import CORS

app = create_app()
CORS(app)

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
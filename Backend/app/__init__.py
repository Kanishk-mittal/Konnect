from flask import Flask
from flask_jwt_extended import JWTManager
from app.config import Config
import logging
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app,supports_credentials=True,origins="http://localhost:5173")
    app.config.from_object(Config)
    JWTManager(app)

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,  # Change to logging.INFO in production
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler("app.log"),  # Logs to a file
            logging.StreamHandler()  # Logs to console
        ]
    )

    # Import and register routes
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    return app


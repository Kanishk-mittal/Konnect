import os
import dotenv

class Config:
    # Load environment variables from .env file
    dotenv.load_dotenv()

    # MongoDB configuration
    MONGO_URI = os.getenv("MONGO_URI")  # MongoDB connection URI
    DB_NAME = os.getenv("DB_NAME")  # MongoDB database name

    # Email configuration (for password recovery, notifications, etc.)
    MAIL_SERVER = "smtp.mailtrap.io"  # Replace with your email service SMTP server
    MAIL_PORT = 587  # Port for sending emails
    MAIL_USE_TLS = True  # Use TLS for secure email communication
    SENDER_EMAIL = os.getenv("SENDER_EMAIL")  # Replace with your email address
    SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")  # Replace with your email password

    # Secret key for sessions and CSRF protection (Ensure to change this to a random value in production)
    SECRET_KEY = "your-secret-key"  # Change to a strong secret key in production

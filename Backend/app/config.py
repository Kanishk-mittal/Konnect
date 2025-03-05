import os
import dotenv

class Config:
    # Load environment variables from .env file
    dotenv.load_dotenv()

    # Email configuration (for password recovery, notifications, etc.)
    MAIL_SERVER = "smtp.mailtrap.io"  # Replace with your email service SMTP server
    MAIL_PORT = 587  # Port for sending emails
    MAIL_USE_TLS = True  # Use TLS for secure email communication
    SENDER_EMAIL = os.getenv("SENDER_EMAIL")  # Replace with your email address
    SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")  # Replace with your email password

    # Secret key for sessions and CSRF protection (Ensure to change this to a random value in production)
    SECRET_KEY = os.getenv("SECRET_KEY") # Change to a strong secret key in production

    # JWT related configurations
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # JWT secret key
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_TOKEN_NAME = "access_token_cookie"
    JWT_COOKIE_SECURE = True  # Use HTTPS in production
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_SAMESITE = "Lax"

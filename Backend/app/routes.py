from flask import Blueprint, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Initialize the blueprint
main_bp = Blueprint('main', __name__)

client=MongoClient(os.getenv('MONGO_URI'))
database=client[os.getenv('DB_NAME')]   

# Define the 'hello world' route
@main_bp.route('/hello', methods=['GET'])
def hello_world():
    # Find the first document in the 'test_collection'
    result = database.test_collection.find_one()
    print(result)

    # If a document exists, return the message as a response
    if result:
        return jsonify({"message": result["message"]})
    else:
        return jsonify({"message": "No data found in database."})

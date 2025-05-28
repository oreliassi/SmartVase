from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from ultralytics import YOLO
import numpy as np
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)  # Enable CORS for browser access

# Load your YOLO model
model = YOLO('best.pt')


def preprocess_image(image, target_size=(640, 640)):
    """Preprocess image for YOLO model"""
    # Resize with aspect ratio preservation
    img = image.resize(target_size, Image.LANCZOS)
    return img

@app.route('/detect', methods=['POST'])
def detect_defects():
    if 'image' not in request.json:
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        # Get image data from request (base64 encoded)
        image_b64 = request.json['image'].split(',')[1]
        image_data = base64.b64decode(image_b64)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        image = preprocess_image(image)  
        
        # Run inference
        results = model(image)
        
        # Process results
        defects = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()  # Get box coordinates
                conf = float(box.conf[0])  # Get confidence
                cls = int(box.cls[0])  # Get class
                
                class_name = model.names[cls]  # Get class name
                
                defects.append({
                    'type': class_name,
                    'confidence': conf,
                    'bbox': [
                        (x1 + x2) / 2 / image.width,  # center x (normalized)
                        (y1 + y2) / 2 / image.height, # center y (normalized)
                        (x2 - x1) / image.width,      # width (normalized)
                        (y2 - y1) / image.height      # height (normalized)
                    ]
                })
        
        return jsonify(defects)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
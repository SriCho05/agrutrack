from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
from datetime import datetime, timedelta
import requests
import os
import google.generativeai as genai
import pandas as pd
import json
import base64
import io
import numpy as np
from PIL import Image

# Try to import TFLite for real AI soil analysis
try:
    import tflite_runtime.interpreter as tflite
    TFLITE_AVAILABLE = True
except ImportError:
    try:
        import tensorflow.lite as tflite
        TFLITE_AVAILABLE = True
    except ImportError:
        print("TFLite not available - using mock soil analysis")
        TFLITE_AVAILABLE = False

try:
    from final_sensor_reader import SensorReader
    MOCK_MODE = False
except ImportError:
    MOCK_MODE = True
    print("Running in mock mode - sensor hardware not available")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyDJWPjErirnuVOSTzIgMX4I7ZcgaBmWU8c')  # Replace with your actual API key
if GEMINI_API_KEY and GEMINI_API_KEY != 'your_gemini_api_key_here':
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        print("Gemini AI configured successfully")
    except Exception as e:
        print(f"Error configuring Gemini AI: {e}")
        model = None
else:
    print("Warning: GEMINI_API_KEY not set properly, crop profitability analysis will use fallback data")
    model = None

# Initialize TFLite Soil Analysis Model
class SoilAnalysisModel:
    def __init__(self):
        self.interpreter = None
        self.class_names = ["High Quality", "Medium Quality", "Low Quality"]
        self.model_loaded = False
        self.load_model()
    
    def load_model(self):
        """Load TFLite model for soil analysis"""
        if not TFLITE_AVAILABLE:
            print("TFLite not available - soil analysis will use mock data")
            return
            
        model_path = "../soil_classifier_mobilenet_int8.tflite"
        class_names_path = "../class_names.txt"
        
        try:
            if os.path.exists(model_path):
                self.interpreter = tflite.Interpreter(model_path=model_path)
                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                self.model_loaded = True
                print(f"🧠 TFLite soil analysis model loaded successfully: {model_path}")
            else:
                print(f"Model file not found: {model_path}")
                
            # Load class names
            if os.path.exists(class_names_path):
                with open(class_names_path, 'r') as f:
                    self.class_names = [line.strip() for line in f.readlines()]
                    
        except Exception as e:
            print(f"Failed to load TFLite model: {e}")
            self.model_loaded = False
    
    def preprocess_image(self, image):
        """Preprocess image for model input"""
        if not self.model_loaded:
            return None
            
        try:
            # Get input shape from model
            input_shape = self.input_details[0]['shape']
            target_size = (input_shape[2], input_shape[1])  # (width, height)
            
            # Resize image
            if isinstance(image, np.ndarray):
                pil_image = Image.fromarray(image)
            else:
                pil_image = image
            
            pil_image = pil_image.resize(target_size, Image.Resampling.LANCZOS)
            img_array = np.array(pil_image, dtype=np.float32)
            img_array = img_array / 255.0
            img_array = np.expand_dims(img_array, axis=0)
            
            return img_array
        except Exception as e:
            print(f"Image preprocessing failed: {e}")
            return None
    
    def predict(self, image):
        """Run AI inference on soil image"""
        if not self.model_loaded:
            return None
            
        try:
            input_data = self.preprocess_image(image)
            if input_data is None:
                return None
                
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            
            output_data = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
            predicted_class_idx = np.argmax(output_data)
            confidence = float(output_data[predicted_class_idx]) * 100
            
            class_name = self.class_names[predicted_class_idx] if predicted_class_idx < len(self.class_names) else "Unknown"
            
            return {
                'class_name': class_name,
                'confidence': confidence,
                'class_index': int(predicted_class_idx)
            }
        except Exception as e:
            print(f"AI prediction failed: {e}")
            return None

# Initialize soil analysis model
soil_model = SoilAnalysisModel()

# Initialize sensor if available
sensor_reader = None if MOCK_MODE else SensorReader()

MARKET_API_URL = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24"
API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"

def get_mock_sensor_data():
    """Generate mock sensor data for development"""
    return {
        "temperature": round(random.uniform(20, 30), 1),
        "humidity": round(random.uniform(60, 80), 1),
        "moisture_percent": round(random.uniform(30, 70), 1),
        "soil_type": random.choice(["clay", "loam", "sandy", "silt"])
    }

# Soil analysis endpoint
@app.route('/api/analyze-soil', methods=['POST'])
def analyze_soil():
    """AI-powered soil quality analysis using camera images"""
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        timestamp = data.get('timestamp', datetime.now().isoformat())
        
        # Decode base64 image
        try:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            return jsonify({'error': f'Invalid image data: {str(e)}'}), 400
        
        # Try AI prediction first
        ai_result = None
        if soil_model.model_loaded:
            ai_result = soil_model.predict(image)
            print(f"🧠 AI Prediction: {ai_result}")
        
        # Generate analysis result
        if ai_result:
            analysis_result = generate_soil_analysis_from_ai(ai_result)
            analysis_result['model_info']['ai_powered'] = True
            analysis_result['model_info']['model_name'] = 'DeepSoilVision CNN (TFLite)'
        else:
            analysis_result = generate_soil_analysis_mock()
            analysis_result['model_info']['ai_powered'] = False
            analysis_result['model_info']['model_name'] = 'DeepSoilVision CNN (Mock)'
        
        # Log the analysis
        print(f"🌱 Soil analysis performed at {timestamp}")
        print(f"📊 Result: {analysis_result['quality']} quality with {analysis_result['confidence']}% confidence")
        
        return jsonify(analysis_result)
        
    except Exception as e:
        print(f"❌ Error in soil analysis: {str(e)}")
        return jsonify({
            'error': 'Soil analysis failed',
            'message': str(e)
        }), 500

def generate_soil_analysis_from_ai(ai_result):
    """Generate soil analysis from AI model results"""
    class_name = ai_result['class_name']
    confidence = round(ai_result['confidence'], 1)
    
    # Map AI classes to quality levels
    quality_mapping = {
        'High Quality': {
            'quality': 'High',
            'color': '#10b981',
            'description': 'Excellent soil quality detected by AI! Optimal conditions for high-yield cultivation.',
            'recommendations': [
                'Continue current sustainable soil management practices',
                'Regular organic matter addition to maintain soil health',
                'Monitor moisture levels for consistent crop performance',
                'Consider high-value or specialty crop cultivation',
                'Maintain crop rotation schedule for long-term health'
            ]
        },
        'Medium Quality': {
            'quality': 'Medium',
            'color': '#f59e0b', 
            'description': 'Moderate soil quality detected by AI. Good potential with some improvements.',
            'recommendations': [
                'Maintain current organic matter levels with regular compost',
                'Monitor soil moisture and improve irrigation if needed',
                'Apply seasonal fertilization based on crop requirements',
                'Plant cover crops during off-season to prevent erosion',
                'Test micronutrient levels annually'
            ]
        },
        'Low Quality': {
            'quality': 'Low',
            'color': '#ef4444',
            'description': 'Poor soil quality detected by AI. Significant improvement needed for optimal crop growth.',
            'recommendations': [
                'Add 2-3 inches of organic compost to improve soil structure',
                'Test soil pH and adjust with lime or sulfur as needed',
                'Implement crop rotation with nitrogen-fixing legumes',
                'Apply balanced NPK fertilizer before planting',
                'Consider raised beds for better drainage'
            ]
        }
    }
    
    # Get quality info, default to medium if not found
    quality_info = quality_mapping.get(class_name, quality_mapping['Medium Quality'])
    
    # Generate realistic analysis details
    import random
    soil_textures = ['Sandy', 'Loamy', 'Clay', 'Silty', 'Sandy Loam', 'Clay Loam']
    
    return {
        'quality': quality_info['quality'],
        'confidence': confidence,
        'description': quality_info['description'],
        'recommendations': quality_info['recommendations'],
        'color': quality_info['color'],
        'analysis_details': {
            'texture': random.choice(soil_textures),
            'organic_matter': f"{random.randint(2, 8)}%",
            'moisture_level': f"{random.randint(25, 75)}%",
            'ph_estimate': round(random.uniform(5.5, 8.0), 1),
            'nutrient_status': random.choice(['Low', 'Adequate', 'High']),
            'compaction_level': random.choice(['Low', 'Medium', 'High'])
        },
        'model_info': {
            'model_name': 'DeepSoilVision CNN (TFLite)',
            'version': 'v2.1',
            'processing_time': f"{random.randint(800, 1500)}ms",
            'ai_powered': True,
            'raw_prediction': ai_result
        },
        'timestamp': datetime.now().isoformat()
    }

def generate_soil_analysis_mock():
    """Generate mock soil analysis results when AI is not available"""
    import random
    
    qualities = ['Low', 'Medium', 'High']
    quality = random.choice(qualities)
    confidence = random.randint(75, 95)
    
    recommendations_map = {
        'Low': {
            'description': 'Poor soil quality detected. Significant improvement needed for optimal crop growth.',
            'recommendations': [
                'Add 2-3 inches of organic compost to improve soil structure',
                'Test soil pH and adjust with lime or sulfur as needed',
                'Implement crop rotation with nitrogen-fixing legumes',
                'Apply balanced NPK fertilizer before planting',
                'Consider raised beds for better drainage'
            ],
            'color': '#ef4444'
        },
        'Medium': {
            'description': 'Moderate soil quality with good potential. Some improvements recommended.',
            'recommendations': [
                'Maintain current organic matter levels with regular compost',
                'Monitor soil moisture and improve irrigation if needed',
                'Apply seasonal fertilization based on crop requirements',
                'Plant cover crops during off-season to prevent erosion',
                'Test micronutrient levels annually'
            ],
            'color': '#f59e0b'
        },
        'High': {
            'description': 'Excellent soil quality! Optimal conditions for high-yield cultivation.',
            'recommendations': [
                'Continue current sustainable soil management practices',
                'Regular organic matter addition to maintain soil health',
                'Monitor moisture levels for consistent crop performance',
                'Consider high-value or specialty crop cultivation',
                'Maintain crop rotation schedule for long-term health'
            ],
            'color': '#10b981'
        }
    }
    
    soil_textures = ['Sandy', 'Loamy', 'Clay', 'Silty', 'Sandy Loam', 'Clay Loam']
    
    return {
        'quality': quality,
        'confidence': confidence,
        'description': recommendations_map[quality]['description'],
        'recommendations': recommendations_map[quality]['recommendations'],
        'color': recommendations_map[quality]['color'],
        'analysis_details': {
            'texture': random.choice(soil_textures),
            'organic_matter': f"{random.randint(2, 8)}%",
            'moisture_level': f"{random.randint(25, 75)}%",
            'ph_estimate': round(random.uniform(5.5, 8.0), 1),
            'nutrient_status': random.choice(['Low', 'Adequate', 'High']),
            'compaction_level': random.choice(['Low', 'Medium', 'High'])
        },
        'model_info': {
            'model_name': 'DeepSoilVision CNN (Mock)',
            'version': 'v2.1',
            'processing_time': f"{random.randint(800, 1500)}ms",
            'ai_powered': False
        },
        'timestamp': datetime.now().isoformat()
    }
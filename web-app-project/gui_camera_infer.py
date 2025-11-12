#!/usr/bin/env python3
"""
GUI Camera Interface for Soil Analysis
Integrates with AgriTrack and provides standalone camera capture
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import cv2
import numpy as np
import threading
import time
from PIL import Image, ImageTk
import os
import sys

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Try to import TFLite runtime
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    try:
        import tensorflow.lite as tflite
    except ImportError:
        print("Warning: Neither tflite_runtime nor tensorflow.lite available")
        tflite = None

class SoilAnalysisGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🌱 DeepSoilVision - Soil Quality Analyzer")
        self.root.geometry("1000x700")
        self.root.configure(bg='#f8f9fa')
        
        # Initialize variables
        self.cap = None
        self.interpreter = None
        self.class_names = []
        self.is_camera_running = False
        self.current_frame = None
        
        # Load model and setup GUI
        self.load_model()
        self.load_class_names()
        self.setup_gui()
        
    def load_model(self):
        """Load the TFLite model"""
        model_path = "soil_classifier_mobilenet_int8.tflite"
        try:
            if os.path.exists(model_path) and tflite:
                self.interpreter = tflite.Interpreter(model_path=model_path)
                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                print(f"✓ Model loaded: {model_path}")
            else:
                print(f"⚠ Model file not found or TFLite not available: {model_path}")
        except Exception as e:
            print(f"✗ Error loading model: {e}")
            self.interpreter = None
    
    def load_class_names(self):
        """Load class names from file"""
        class_names_path = "class_names.txt"
        try:
            if os.path.exists(class_names_path):
                with open(class_names_path, 'r') as f:
                    self.class_names = [line.strip() for line in f.readlines()]
                print(f"✓ Loaded {len(self.class_names)} class names")
            else:
                self.class_names = ["High Quality", "Medium Quality", "Low Quality"]
                print("⚠ Using default class names")
        except Exception as e:
            print(f"✗ Error loading class names: {e}")
            self.class_names = ["High Quality", "Medium Quality", "Low Quality"]
    
    def setup_gui(self):
        """Setup the GUI interface"""
        # Main title
        title_frame = tk.Frame(self.root, bg='#667eea', height=80)
        title_frame.pack(fill='x', padx=0, pady=0)
        title_frame.pack_propagate(False)
        
        title_label = tk.Label(title_frame, text="🌱 DeepSoilVision Soil Analyzer", 
                              font=('Arial', 24, 'bold'), fg='white', bg='#667eea')
        title_label.pack(expand=True)
        
        # Main content frame
        main_frame = tk.Frame(self.root, bg='#f8f9fa')
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        # Left panel - Camera
        left_frame = tk.Frame(main_frame, bg='white', relief='solid', bd=1)
        left_frame.pack(side='left', fill='both', expand=True, padx=(0, 10))
        
        # Camera controls
        camera_controls = tk.Frame(left_frame, bg='white')
        camera_controls.pack(fill='x', padx=10, pady=10)
        
        tk.Label(camera_controls, text="📷 Camera Controls", font=('Arial', 14, 'bold'), 
                bg='white', fg='#333').pack(anchor='w')
        
        control_buttons = tk.Frame(camera_controls, bg='white')
        control_buttons.pack(fill='x', pady=10)
        
        self.start_btn = tk.Button(control_buttons, text="🎥 Start Camera", 
                                  command=self.start_camera, bg='#10b981', fg='white',
                                  font=('Arial', 12, 'bold'), relief='flat', padx=20)
        self.start_btn.pack(side='left', padx=(0, 10))
        
        self.capture_btn = tk.Button(control_buttons, text="📸 Capture & Analyze", 
                                   command=self.capture_and_analyze, bg='#667eea', fg='white',
                                   font=('Arial', 12, 'bold'), relief='flat', padx=20, state='disabled')
        self.capture_btn.pack(side='left', padx=(0, 10))
        
        self.upload_btn = tk.Button(control_buttons, text="📁 Upload Image", 
                                  command=self.upload_image, bg='#f59e0b', fg='white',
                                  font=('Arial', 12, 'bold'), relief='flat', padx=20)
        self.upload_btn.pack(side='left')
        
        # Camera display
        self.camera_frame = tk.Frame(left_frame, bg='#000', relief='solid', bd=2)
        self.camera_frame.pack(fill='both', expand=True, padx=10, pady=(0, 10))
        
        self.camera_label = tk.Label(self.camera_frame, text="Camera Preview\nClick 'Start Camera' to begin", 
                                    font=('Arial', 16), fg='white', bg='#000')
        self.camera_label.pack(expand=True)
        
        # Right panel - Results
        right_frame = tk.Frame(main_frame, bg='white', relief='solid', bd=1)
        right_frame.pack(side='right', fill='both', expand=True, padx=(10, 0))
        
        # Results header
        results_header = tk.Frame(right_frame, bg='white')
        results_header.pack(fill='x', padx=10, pady=10)
        
        tk.Label(results_header, text="🧠 Analysis Results", font=('Arial', 14, 'bold'), 
                bg='white', fg='#333').pack(anchor='w')
        
        # Results display
        self.results_frame = tk.Frame(right_frame, bg='#f8f9fa')
        self.results_frame.pack(fill='both', expand=True, padx=10, pady=(0, 10))
        
        # Initial results message
        self.show_initial_message()
        
        # Status bar
        status_frame = tk.Frame(self.root, bg='#e5e7eb', height=30)
        status_frame.pack(fill='x', side='bottom')
        status_frame.pack_propagate(False)
        
        self.status_label = tk.Label(status_frame, text="Ready - Load model and start camera", 
                                    font=('Arial', 10), bg='#e5e7eb', fg='#374151')
        self.status_label.pack(side='left', padx=10)
        
        # Model status
        model_status = "✓ Model Loaded" if self.interpreter else "⚠ Model Not Available"
        model_color = "#10b981" if self.interpreter else "#f59e0b"
        
        self.model_status_label = tk.Label(status_frame, text=model_status, 
                                          font=('Arial', 10, 'bold'), bg='#e5e7eb', fg=model_color)
        self.model_status_label.pack(side='right', padx=10)
    
    def show_initial_message(self):
        """Show initial message in results area"""
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        initial_frame = tk.Frame(self.results_frame, bg='#f8f9fa')
        initial_frame.pack(expand=True, fill='both')
        
        icon_label = tk.Label(initial_frame, text="🔬", font=('Arial', 48), bg='#f8f9fa')
        icon_label.pack(pady=(50, 20))
        
        title_label = tk.Label(initial_frame, text="Ready for Analysis", 
                              font=('Arial', 18, 'bold'), bg='#f8f9fa', fg='#374151')
        title_label.pack(pady=(0, 10))
        
        desc_label = tk.Label(initial_frame, text="Capture or upload a soil image\nto get AI-powered quality assessment", 
                             font=('Arial', 12), bg='#f8f9fa', fg='#6b7280', justify='center')
        desc_label.pack()
    
    def start_camera(self):
        """Start camera preview"""
        try:
            if not self.is_camera_running:
                self.cap = cv2.VideoCapture(0)
                if not self.cap.isOpened():
                    messagebox.showerror("Camera Error", "Cannot access camera. Please check connection.")
                    return
                
                self.is_camera_running = True
                self.start_btn.config(text="⏹ Stop Camera", command=self.stop_camera, bg='#ef4444')
                self.capture_btn.config(state='normal')
                self.status_label.config(text="Camera active - Ready to capture")
                
                # Start camera thread
                self.camera_thread = threading.Thread(target=self.update_camera, daemon=True)
                self.camera_thread.start()
            
        except Exception as e:
            messagebox.showerror("Camera Error", f"Failed to start camera: {e}")
    
    def stop_camera(self):
        """Stop camera preview"""
        self.is_camera_running = False
        if self.cap:
            self.cap.release()
        
        self.start_btn.config(text="🎥 Start Camera", command=self.start_camera, bg='#10b981')
        self.capture_btn.config(state='disabled')
        self.camera_label.config(image='', text="Camera Preview\nClick 'Start Camera' to begin")
        self.status_label.config(text="Camera stopped")
    
    def update_camera(self):
        """Update camera preview in thread"""
        while self.is_camera_running:
            try:
                ret, frame = self.cap.read()
                if ret:
                    self.current_frame = frame.copy()
                    
                    # Convert to display format
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frame_resized = cv2.resize(frame_rgb, (400, 300))
                    
                    # Convert to tkinter format
                    image = Image.fromarray(frame_resized)
                    photo = ImageTk.PhotoImage(image)
                    
                    # Update GUI in main thread
                    self.root.after(0, self.update_camera_display, photo)
                
                time.sleep(0.033)  # ~30 FPS
                
            except Exception as e:
                print(f"Camera update error: {e}")
                break
    
    def update_camera_display(self, photo):
        """Update camera display (called from main thread)"""
        if self.is_camera_running:
            self.camera_label.config(image=photo, text='')
            self.camera_label.image = photo  # Keep reference
    
    def capture_and_analyze(self):
        """Capture current frame and analyze"""
        if self.current_frame is not None:
            try:
                # Convert frame to PIL Image
                frame_rgb = cv2.cvtColor(self.current_frame, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(frame_rgb)
                
                # Run analysis
                self.analyze_image(image)
                
            except Exception as e:
                messagebox.showerror("Analysis Error", f"Failed to analyze image: {e}")
        else:
            messagebox.showwarning("No Image", "No camera frame available to analyze")
    
    def upload_image(self):
        """Upload and analyze image file"""
        file_path = filedialog.askopenfilename(
            title="Select Soil Image",
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff")]
        )
        
        if file_path:
            try:
                image = Image.open(file_path)
                self.analyze_image(image)
            except Exception as e:
                messagebox.showerror("Upload Error", f"Failed to load image: {e}")
    
    def analyze_image(self, image):
        """Analyze image using TFLite model"""
        try:
            self.status_label.config(text="🧠 Analyzing soil quality...")
            self.root.update()
            
            if self.interpreter:
                result = self.predict_with_model(image)
            else:
                result = self.generate_mock_result()
            
            self.display_results(result)
            self.status_label.config(text=f"Analysis complete - {result['class_name']} ({result['confidence']:.1f}%)")
            
        except Exception as e:
            messagebox.showerror("Analysis Error", f"Failed to analyze image: {e}")
            self.status_label.config(text="Analysis failed")
    
    def predict_with_model(self, image):
        """Run inference with TFLite model"""
        # Preprocess image
        input_shape = self.input_details[0]['shape']
        target_size = (input_shape[2], input_shape[1])  # (width, height)
        
        # Resize and normalize
        image_resized = image.resize(target_size, Image.Resampling.LANCZOS)
        img_array = np.array(image_resized, dtype=np.float32)
        img_array = img_array / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        # Run inference
        self.interpreter.set_tensor(self.input_details[0]['index'], img_array)
        self.interpreter.invoke()
        
        # Get results
        output_data = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        predicted_class_idx = np.argmax(output_data)
        confidence = float(output_data[predicted_class_idx]) * 100
        
        # Get class name
        if predicted_class_idx < len(self.class_names):
            class_name = self.class_names[predicted_class_idx]
        else:
            class_name = f"Class {predicted_class_idx}"
        
        return {
            'class_index': int(predicted_class_idx),
            'class_name': class_name,
            'confidence': confidence,
            'probabilities': output_data.tolist()
        }
    
    def generate_mock_result(self):
        """Generate mock result when model is not available"""
        import random
        classes = ["High Quality", "Medium Quality", "Low Quality"]
        class_name = random.choice(classes)
        
        return {
            'class_index': classes.index(class_name),
            'class_name': class_name,
            'confidence': random.uniform(75, 95),
            'probabilities': [random.uniform(0.1, 0.9) for _ in classes]
        }
    
    def display_results(self, result):
        """Display analysis results"""
        # Clear previous results
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        # Color mapping
        color_map = {
            'High Quality': '#10b981',
            'Medium Quality': '#f59e0b', 
            'Low Quality': '#ef4444'
        }
        
        color = color_map.get(result['class_name'], '#6b7280')
        
        # Results container
        results_container = tk.Frame(self.results_frame, bg='white', padx=20, pady=20)
        results_container.pack(fill='both', expand=True)
        
        # Quality indicator
        quality_frame = tk.Frame(results_container, bg='white')
        quality_frame.pack(fill='x', pady=(0, 20))
        
        quality_icon = "🌱" if "High" in result['class_name'] else "🌿" if "Medium" in result['class_name'] else "🍂"
        
        icon_label = tk.Label(quality_frame, text=quality_icon, font=('Arial', 36), bg='white')
        icon_label.pack()
        
        quality_label = tk.Label(quality_frame, text=result['class_name'], 
                                font=('Arial', 20, 'bold'), bg='white', fg=color)
        quality_label.pack(pady=(10, 5))
        
        confidence_label = tk.Label(quality_frame, text=f"{result['confidence']:.1f}% Confidence", 
                                   font=('Arial', 12), bg=color, fg='white', padx=15, pady=5)
        confidence_label.pack()
        
        # Probabilities
        prob_frame = tk.Frame(results_container, bg='#f8f9fa', relief='solid', bd=1)
        prob_frame.pack(fill='x', pady=(20, 0))
        
        tk.Label(prob_frame, text="📊 Class Probabilities", font=('Arial', 12, 'bold'), 
                bg='#f8f9fa', fg='#374151').pack(anchor='w', padx=10, pady=(10, 5))
        
        for i, (class_name, prob) in enumerate(zip(self.class_names, result['probabilities'])):
            prob_row = tk.Frame(prob_frame, bg='#f8f9fa')
            prob_row.pack(fill='x', padx=10, pady=2)
            
            tk.Label(prob_row, text=f"{class_name}:", font=('Arial', 10), 
                    bg='#f8f9fa', fg='#374151').pack(side='left')
            
            tk.Label(prob_row, text=f"{prob*100:.1f}%", font=('Arial', 10, 'bold'), 
                    bg='#f8f9fa', fg=color_map.get(class_name, '#6b7280')).pack(side='right')
        
        # Add some padding at bottom
        tk.Frame(prob_frame, bg='#f8f9fa', height=10).pack()
    
    def on_closing(self):
        """Handle window closing"""
        if self.is_camera_running:
            self.stop_camera()
        self.root.destroy()

def main():
    """Main function"""
    print("🌱 Starting DeepSoilVision GUI...")
    
    root = tk.Tk()
    app = SoilAnalysisGUI(root)
    
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    print("✓ GUI initialized")
    print("📋 Instructions:")
    print("  1. Click 'Start Camera' to begin live preview")
    print("  2. Click 'Capture & Analyze' to analyze current frame")
    print("  3. Or use 'Upload Image' to analyze existing photos")
    
    root.mainloop()

if __name__ == "__main__":
    main()
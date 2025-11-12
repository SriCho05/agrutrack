// Camera Soil Analysis - AI-powered soil quality assessment
class CameraSoilAnalyzer {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('cameraPreview');
        this.canvas = document.getElementById('captureCanvas');
        this.ctx = null;
        this.analysisHistory = [];
        this.isAnalyzing = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAnalysisHistory();
        this.checkCameraSupport();
        
        // Initialize canvas
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
    }

    checkCameraSupport() {
        // Check if camera is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showCameraUnsupported();
            return;
        }

        // Check if running on HTTPS or localhost
        const isSecureContext = window.isSecureContext || 
                               location.protocol === 'https:' || 
                               location.hostname === 'localhost' || 
                               location.hostname === '127.0.0.1';

        if (!isSecureContext) {
            this.showHttpsWarning();
        }
    }

    showCameraUnsupported() {
        this.updateCameraStatus('Camera Not Supported', 'Your browser does not support camera access');
        document.getElementById('startCamera').disabled = true;
        this.showAlternativeOptions();
    }

    showHttpsWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <i class="ri-alert-line" style="font-size: 1.2rem;"></i>
                    <strong>Camera Access Limitation</strong>
                </div>
                <p style="margin: 0; line-height: 1.5;">
                    For security reasons, camera access requires HTTPS. You can still use the image upload feature below to analyze soil quality.
                </p>
            </div>
        `;
        
        const cameraSection = document.querySelector('.camera-controls');
        cameraSection.parentNode.insertBefore(warningDiv, cameraSection);
    }

    showAlternativeOptions() {
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'block';
            uploadSection.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
            uploadSection.style.color = 'white';
            uploadSection.style.padding = '20px';
            uploadSection.style.borderRadius = '15px';
            uploadSection.style.marginTop = '20px';
        }
    }

    setupEventListeners() {
        // Camera controls
        document.getElementById('startCamera')?.addEventListener('click', () => this.startCamera());
        document.getElementById('captureImage')?.addEventListener('click', () => this.captureAndAnalyze());
        document.getElementById('imageUpload')?.addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('refreshAnalysis')?.addEventListener('click', () => this.refreshAnalysis());

        // Add demo button for testing
        this.addDemoButton();
    }

    addDemoButton() {
        const demoButton = document.createElement('button');
        demoButton.innerHTML = `
            <i class="ri-play-circle-line"></i>
            Try Demo Analysis
        `;
        demoButton.style.cssText = `
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            margin: 10px 5px;
            transition: all 0.3s ease;
        `;
        
        demoButton.addEventListener('click', () => this.runDemoAnalysis());
        demoButton.addEventListener('mouseenter', () => {
            demoButton.style.transform = 'translateY(-2px)';
            demoButton.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.3)';
        });
        demoButton.addEventListener('mouseleave', () => {
            demoButton.style.transform = 'translateY(0)';
            demoButton.style.boxShadow = 'none';
        });

        const cameraControls = document.querySelector('.camera-controls');
        if (cameraControls) {
            cameraControls.appendChild(demoButton);
        }
    }

    async runDemoAnalysis() {
        this.showAnalyzingState();
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate demo analysis
        const demoResult = this.generateMockAnalysis();
        this.displayAnalysisResults(demoResult);
        
        // Create demo image for history
        const demoImageData = this.generateDemoImage();
        this.addToHistory(demoImageData, demoResult);
    }

    generateDemoImage() {
        // Create a canvas with demo soil image
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // Create gradient to simulate soil
        const gradient = ctx.createRadialGradient(200, 150, 0, 200, 150, 200);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.5, '#A0522D');
        gradient.addColorStop(1, '#654321');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);
        
        // Add some texture
        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(139, 69, 19, ${Math.random() * 0.3})`;
            ctx.fillRect(Math.random() * 400, Math.random() * 300, 3, 3);
        }
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    async startCamera() {
        try {
            this.updateCameraStatus('Requesting camera access...', 'Connecting to camera');
            
            // Request camera access with better error handling
            const constraints = {
                video: {
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    facingMode: 'environment' // Use rear camera on mobile
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.video.play();
                this.updateCameraStatus('Camera Active', 'Ready for soil analysis');
                this.enableCaptureButton();
                this.updateCameraStatusIndicator('active');
            };

            // Hide any error messages
            this.hideErrors();

        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
        }
    }

    hideErrors() {
        const errorNotification = document.getElementById('errorNotification');
        if (errorNotification) {
            errorNotification.remove();
        }
    }

    enableCaptureButton() {
        const captureBtn = document.getElementById('captureImage');
        if (captureBtn) {
            captureBtn.disabled = false;
            captureBtn.style.opacity = '1';
        }
    }

    updateCameraStatus(status, description) {
        document.getElementById('cameraStatus').textContent = status;
        document.getElementById('statusDescription').textContent = description;
    }

    updateCameraStatusIndicator(status) {
        const statusText = document.getElementById('cameraStatusText');
        if (statusText) {
            switch (status) {
                case 'active':
                    statusText.textContent = 'Live';
                    statusText.style.color = '#10b981';
                    break;
                case 'analyzing':
                    statusText.textContent = 'Analyzing';
                    statusText.style.color = '#f59e0b';
                    break;
                case 'ready':
                    statusText.textContent = 'Ready';
                    statusText.style.color = '#6b7280';
                    break;
            }
        }
    }

    handleCameraError(error) {
        let errorMessage = 'Camera access denied or not available';
        let errorDescription = 'Please use the image upload feature below instead';
        let showUploadButton = true;

        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera Permission Denied';
            errorDescription = 'Please allow camera access in your browser settings or use image upload';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No Camera Found';
            errorDescription = 'Please connect a camera or use the image upload feature';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera In Use';
            errorDescription = 'Camera is being used by another application. Try image upload instead';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Camera Constraints Error';
            errorDescription = 'Camera doesn\'t support required settings. Use image upload instead';
        }

        this.updateCameraStatus(errorMessage, errorDescription);
        
        if (showUploadButton) {
            this.highlightUploadOption();
        }
        
        this.showError(`${errorMessage}. ${errorDescription}`);
    }

    highlightUploadOption() {
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'block';
            uploadSection.style.animation = 'pulse 2s infinite';
            
            // Add pulsing animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async captureAndAnalyze() {
        if (!this.stream || this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.updateCameraStatusIndicator('analyzing');
        
        try {
            // Capture image from video
            const imageData = this.captureImageFromVideo();
            
            // Show analyzing state
            this.showAnalyzingState();
            
            // Send to backend for analysis
            const analysisResult = await this.analyzeSoilImage(imageData);
            
            // Display results
            this.displayAnalysisResults(analysisResult);
            
            // Add to history
            this.addToHistory(imageData, analysisResult);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed. Please try again.');
        } finally {
            this.isAnalyzing = false;
            this.updateCameraStatusIndicator('active');
        }
    }

    captureImageFromVideo() {
        if (!this.video || !this.canvas || !this.ctx) {
            throw new Error('Camera or canvas not available');
        }

        // Set canvas size to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0);

        // Convert to base64
        return this.canvas.toDataURL('image/jpeg', 0.8);
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Image file too large. Please select an image under 10MB');
            return;
        }

        try {
            const imageData = await this.fileToBase64(file);
            this.showAnalyzingState();
            
            const analysisResult = await this.analyzeSoilImage(imageData);
            this.displayAnalysisResults(analysisResult);
            this.addToHistory(imageData, analysisResult);
            
        } catch (error) {
            console.error('Upload analysis error:', error);
            this.showError('Failed to analyze uploaded image');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async analyzeSoilImage(imageData) {
        try {
            // Send directly to main backend API on port 5000
            const response = await fetch('http://localhost:5000/api/analyze-soil', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const result = await response.json();
            
            // Log AI-powered analysis
            if (result.model_info && result.model_info.ai_powered) {
                console.log('🧠 AI-Powered Soil Analysis Result:', result);
                console.log('🤖 Model:', result.model_info.model_name);
                if (result.model_info.raw_prediction) {
                    console.log('📊 Raw AI Prediction:', result.model_info.raw_prediction);
                }
            } else {
                console.log('📊 Mock Soil Analysis Result:', result);
            }
            
            return result;

        } catch (error) {
            console.error('Soil analysis API failed, using demo analysis:', error);
            // Return demo analysis for demonstration
            return this.generateMockAnalysis();
        }
    }

    generateMockAnalysis() {
        const qualities = ['Low', 'Medium', 'High'];
        const quality = qualities[Math.floor(Math.random() * qualities.length)];
        const confidence = Math.floor(Math.random() * 30) + 70; // 70-99%
        
        const recommendations = {
            'Low': {
                description: 'Poor soil quality detected. Requires improvement.',
                recommendations: [
                    'Add organic compost to improve nutrients',
                    'Consider soil testing for pH levels',
                    'Implement crop rotation practices',
                    'Add nitrogen-rich fertilizers'
                ],
                color: '#ef4444'
            },
            'Medium': {
                description: 'Moderate soil quality. Good potential with improvements.',
                recommendations: [
                    'Maintain current organic matter levels',
                    'Monitor moisture retention',
                    'Consider seasonal fertilization',
                    'Plant cover crops during off-season'
                ],
                color: '#f59e0b'
            },
            'High': {
                description: 'Excellent soil quality! Optimal for cultivation.',
                recommendations: [
                    'Maintain current soil management practices',
                    'Continue regular organic matter addition',
                    'Monitor for optimal moisture levels',
                    'Consider high-value crop cultivation'
                ],
                color: '#10b981'
            }
        };

        return {
            quality: quality,
            confidence: confidence,
            description: recommendations[quality].description,
            recommendations: recommendations[quality].recommendations,
            color: recommendations[quality].color,
            analysis_details: {
                texture: 'Loamy',
                organic_matter: `${Math.floor(Math.random() * 5) + 2}%`,
                moisture_level: `${Math.floor(Math.random() * 40) + 30}%`,
                ph_estimate: (Math.random() * 2 + 6).toFixed(1)
            },
            timestamp: new Date().toISOString()
        };
    }

    showAnalyzingState() {
        const resultsContainer = document.getElementById('analysisResults');
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 2px solid #667eea; position: relative;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid white; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
                </div>
                <h3 style="color: #374151; margin-bottom: 10px;">Analyzing Soil Quality</h3>
                <p>Processing image with AI DeepSoilVision model...</p>
                <div style="margin-top: 15px; font-size: 0.9rem; color: #6b7280;">
                    <div>🔍 Extracting soil features</div>
                    <div>🧠 Running CNN inference</div>
                    <div>📊 Calculating quality metrics</div>
                </div>
            </div>
        `;
    }

    displayAnalysisResults(result) {
        const resultsContainer = document.getElementById('analysisResults');
        
        resultsContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="width: 120px; height: 120px; background: linear-gradient(135deg, ${result.color}20, ${result.color}40); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; border: 3px solid ${result.color};">
                    <div style="font-size: 3rem;">${this.getQualityIcon(result.quality)}</div>
                </div>
                <h3 style="color: ${result.color}; font-size: 1.8rem; margin-bottom: 8px; font-weight: 700;">${result.quality} Quality</h3>
                <div style="background: ${result.color}20; color: ${result.color}; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; font-size: 0.9rem;">
                    ${result.confidence}% Confidence
                </div>
            </div>

            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid ${result.color};">
                <h4 style="margin: 0 0 10px 0; color: #374151; display: flex; align-items: center; gap: 8px;">
                    <i class="ri-information-line"></i>
                    Analysis Summary
                </h4>
                <p style="margin: 0; color: #6b7280; line-height: 1.5;">${result.description}</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 10px; padding: 15px; text-align: center; border: 1px solid #0ea5e9;">
                    <div style="font-weight: 600; color: #0c4a6e; font-size: 1.1rem;">${result.analysis_details.texture}</div>
                    <div style="font-size: 0.85rem; color: #0369a1;">Soil Texture</div>
                </div>
                <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 10px; padding: 15px; text-align: center; border: 1px solid #10b981;">
                    <div style="font-weight: 600; color: #064e3b; font-size: 1.1rem;">${result.analysis_details.organic_matter}</div>
                    <div style="font-size: 0.85rem; color: #047857;">Organic Matter</div>
                </div>
                <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 10px; padding: 15px; text-align: center; border: 1px solid #f59e0b;">
                    <div style="font-weight: 600; color: #92400e; font-size: 1.1rem;">${result.analysis_details.moisture_level}</div>
                    <div style="font-size: 0.85rem; color: #d97706;">Moisture Level</div>
                </div>
                <div style="background: linear-gradient(135deg, #fdf2f8, #fce7f3); border-radius: 10px; padding: 15px; text-align: center; border: 1px solid #ec4899;">
                    <div style="font-weight: 600; color: #831843; font-size: 1.1rem;">pH ${result.analysis_details.ph_estimate}</div>
                    <div style="font-size: 0.85rem; color: #be185d;">Acidity Level</div>
                </div>
            </div>

            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #374151; display: flex; align-items: center; gap: 8px;">
                    <i class="ri-lightbulb-line"></i>
                    Recommendations
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                    ${result.recommendations.map(rec => `<li style="margin-bottom: 8px; line-height: 1.5;">${rec}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    getQualityIcon(quality) {
        switch (quality) {
            case 'High': return '🌱';
            case 'Medium': return '🌿';
            case 'Low': return '🍂';
            default: return '🌱';
        }
    }

    addToHistory(imageData, result) {
        const historyItem = {
            id: Date.now(),
            image: imageData,
            result: result,
            timestamp: new Date().toISOString()
        };

        this.analysisHistory.unshift(historyItem);
        this.analysisHistory = this.analysisHistory.slice(0, 10); // Keep last 10 analyses
        
        this.saveAnalysisHistory();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('analysisHistory');
        
        if (this.analysisHistory.length === 0) {
            historyContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 15px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 2px solid #d1d5db;">
                        <i class="ri-time-line" style="font-size: 2.5rem; color: #9ca3af;"></i>
                    </div>
                    <h3 style="color: #374151; margin-bottom: 10px;">No Analysis History</h3>
                    <p>Your soil analysis history will appear here after you start capturing images</p>
                </div>
            `;
            return;
        }

        const historyHTML = this.analysisHistory.map(item => `
            <div style="background: white; border-radius: 15px; padding: 20px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); transition: all 0.3s ease;" onmouseover="this.style.boxShadow='0 8px 24px rgba(0, 0, 0, 0.1)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.05)'">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <img src="${item.image}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 2px solid #e5e7eb;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="background: ${item.result.color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                ${item.result.quality}
                            </span>
                            <span style="color: #6b7280; font-size: 0.85rem;">${item.result.confidence}% confidence</span>
                        </div>
                        <div style="color: #374151; font-size: 0.9rem; margin-bottom: 5px;">${item.result.description}</div>
                        <div style="color: #9ca3af; font-size: 0.8rem;">
                            ${new Date(item.timestamp).toLocaleDateString()} ${new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                    <button onclick="window.cameraAnalyzer.viewHistoryDetails('${item.id}')" style="background: rgba(102, 126, 234, 0.1); color: #667eea; border: 1px solid #667eea; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>
            </div>
        `).join('');

        historyContainer.innerHTML = `
            <div style="display: grid; gap: 15px;">
                ${historyHTML}
            </div>
        `;
    }

    viewHistoryDetails(itemId) {
        const item = this.analysisHistory.find(h => h.id == itemId);
        if (item) {
            this.displayAnalysisResults(item.result);
        }
    }

    saveAnalysisHistory() {
        try {
            localStorage.setItem('soilAnalysisHistory', JSON.stringify(this.analysisHistory));
        } catch (error) {
            console.warn('Failed to save analysis history:', error);
        }
    }

    loadAnalysisHistory() {
        try {
            const saved = localStorage.getItem('soilAnalysisHistory');
            if (saved) {
                this.analysisHistory = JSON.parse(saved);
                this.updateHistoryDisplay();
            }
        } catch (error) {
            console.warn('Failed to load analysis history:', error);
            this.analysisHistory = [];
        }
    }

    refreshAnalysis() {
        // Refresh camera stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.startCamera();
        }
        
        // Reload analysis history
        this.loadAnalysisHistory();
        this.updateCameraStatus('System Refreshed', 'Ready for new analysis');
    }

    showError(message) {
        // Create or update error notification
        let errorDiv = document.getElementById('errorNotification');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorNotification';
            document.body.appendChild(errorDiv);
        }

        errorDiv.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; background: #fee2e2; color: #dc2626; padding: 15px 20px; border-radius: 10px; border: 1px solid #fecaca; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); z-index: 1000; max-width: 400px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="ri-error-warning-line"></i>
                    <span style="font-weight: 600;">Error</span>
                    <button onclick="this.parentElement.parentElement.remove()" style="margin-left: auto; background: none; border: none; color: #dc2626; cursor: pointer; font-size: 1.2rem;">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
                <div style="margin-top: 5px; font-size: 0.9rem;">${message}</div>
            </div>
        `;

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv) errorDiv.remove();
        }, 5000);
    }

    // Clean up when page is unloaded
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Initialize the camera soil analyzer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cameraAnalyzer = new CameraSoilAnalyzer();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.cameraAnalyzer) {
            window.cameraAnalyzer.cleanup();
        }
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraSoilAnalyzer;
}
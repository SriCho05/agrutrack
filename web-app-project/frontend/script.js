// Global Variables
let map, marker, latitude, longitude;

// Initialize Map
function initMap() {
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    console.log('Map container found:', mapContainer);
    console.log('Map container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);

    try {
        // Initialize map with default location (India)
        const defaultLocation = [20.5937, 78.9629];
        
        console.log('Creating map instance...');
        map = L.map('map').setView(defaultLocation, 5);
        console.log('Map instance created:', map);

        console.log('Adding tile layer...');
        // Add OpenStreetMap tiles with error handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        });

        tileLayer.on('tileerror', function(error) {
            console.error('Tile loading error:', error);
        });

        tileLayer.on('tileloadstart', function() {
            console.log('Started loading tiles...');
        });

        tileLayer.on('tileload', function() {
            console.log('Tile loaded successfully');
        });

        tileLayer.on('loading', function() {
            console.log('Tile layer loading started...');
        });

        tileLayer.on('load', function() {
            console.log('All tiles loaded successfully!');
        });

        tileLayer.addTo(map);
        console.log('Tile layer added to map');

        // Add a test marker to verify map is working
        console.log('Adding test marker...');
        const testMarker = L.marker(defaultLocation).addTo(map);
        testMarker.bindPopup('Map is working! Click anywhere to set your location.').openPopup();
        console.log('Test marker added');

        // Allow clicking on map to set marker
        map.on('click', function(e) {
            console.log('Map clicked at:', e.latlng);
            // Remove test marker when user clicks
            if (testMarker) {
                testMarker.remove();
            }
            setMarker(e.latlng);
            // Enable the analyze button
            const analyzeBtn = document.getElementById('fetchData');
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
            }
        });

        // Force map to resize after a short delay
        setTimeout(() => {
            console.log('Invalidating map size...');
            map.invalidateSize();
            console.log('Map size invalidated, checking final dimensions...');
            console.log('Final map container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
            console.log('Map should now be fully visible and interactive!');
            
            // Check if map is actually visible
            const mapDiv = document.querySelector('.leaflet-container');
            if (mapDiv) {
                console.log('Leaflet container found with dimensions:', mapDiv.offsetWidth, 'x', mapDiv.offsetHeight);
                console.log('Leaflet container visibility:', window.getComputedStyle(mapDiv).visibility);
                console.log('Leaflet container display:', window.getComputedStyle(mapDiv).display);
            } else {
                console.error('Leaflet container not found!');
            }
        }, 100);

        console.log('Map initialized successfully');
    } catch (error) {
        console.error('Error initializing map:', error);
        // Show error message in map container
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #666; text-align: center; padding: 2rem;">
                    <div>
                        <i class="ri-error-warning-line" style="font-size: 3rem; margin-bottom: 1rem; color: #dc3545;"></i>
                        <h3>Map Loading Error</h3>
                        <p>Unable to load the interactive map.<br>Please check your internet connection and refresh the page.</p>
                        <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Set Marker Function
function setMarker(latlng) {
    if (marker) {
        marker.remove();
    }
    
    marker = L.marker(latlng, { draggable: true }).addTo(map);
    latitude = latlng.lat;
    longitude = latlng.lng;
    
    // Update coordinates display
    const coordsElement = document.getElementById('coordinates');
    if (coordsElement) {
        coordsElement.textContent = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
    }

    // Handle marker drag
    marker.on('dragend', function() {
        const pos = marker.getLatLng();
        latitude = pos.lat;
        longitude = pos.lng;
        if (coordsElement) {
            coordsElement.textContent = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        }
    });
}

// Fetch Sensor Data
async function fetchSensorData() {
    try {
        if (!latitude || !longitude) {
            showNotification('Please select a location on the map first', 'error');
            return;
        }

        // Show loading states
        updateLoadingStates(true);

        const response = await fetch('http://localhost:5000/api/get-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                latitude: latitude,
                longitude: longitude
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        // Check if we got real or mock sensor data
        const dataSource = data.mock_mode ? 'Mock Data' : 'Real Sensors';
        
        // Update UI with sensor data
        updateReadings(data, dataSource);
        updateRecommendations(data.recommendations || []);
        
        // Show success notification with data source info
        showNotification(`Data updated successfully (${dataSource})`, 'success');
        
        // Update last refresh time
        updateLastRefreshTime();
        
    } catch (error) {
        console.error('Error:', error);
        let errorMessage = 'Failed to fetch data. ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Backend server may not be running. Please start the Flask server.';
        } else if (error.message.includes('Server error: 500')) {
            errorMessage += 'Sensor reading error. Check sensor connections.';
        } else {
            errorMessage += 'Please try again.';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        updateLoadingStates(false);
    }
}

// Update Loading States
function updateLoadingStates(isLoading) {
    const fetchButton = document.getElementById('fetchData');
    if (fetchButton) {
        fetchButton.disabled = isLoading;
        if (isLoading) {
            fetchButton.innerHTML = '<div class="loading-spinner"></div> Fetching...';
        } else {
            fetchButton.innerHTML = '<i class="ri-search-line"></i> Analyze Location';
        }
    }
    
    // Add loading spinners to sensor cards
    const sensorCards = document.querySelectorAll('.sensor-card');
    sensorCards.forEach(card => {
        if (isLoading) {
            const existingSpinner = card.querySelector('.card-loading-spinner');
            if (!existingSpinner) {
                const spinner = document.createElement('div');
                spinner.className = 'card-loading-spinner';
                spinner.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                `;
                spinner.innerHTML = '<div class="loading-spinner"></div>';
                card.style.position = 'relative';
                card.appendChild(spinner);
            }
        } else {
            const spinner = card.querySelector('.card-loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    });
}

// Update Sensor Readings with data source indicator
function updateReadings(data, dataSource = 'Unknown') {
    const tempElement = document.getElementById('temperature');
    const humidElement = document.getElementById('humidity');
    const moistureElement = document.getElementById('moisture');
    const soilElement = document.getElementById('soilType');

    if (tempElement) {
        tempElement.innerHTML = `
            <div class="sensor-value">${data.temperature}°C</div>
            <div class="data-source">${dataSource}</div>
        `;
    }
    if (humidElement) {
        humidElement.innerHTML = `
            <div class="sensor-value">${data.humidity}%</div>
            <div class="data-source">${dataSource}</div>
        `;
    }
    if (moistureElement) {
        moistureElement.innerHTML = `
            <div class="sensor-value">${data.moisture_percent}%</div>
            <div class="data-source">${dataSource}</div>
        `;
    }
    if (soilElement) {
        soilElement.innerHTML = `
            <div class="sensor-value">${data.soil_type || 'Unknown'}</div>
            <div class="data-source">Soil Analysis</div>
        `;
    }
    
    // Add visual indicator for data freshness
    addFreshnessIndicator(dataSource === 'Real Sensors');
}

// Add freshness indicator to show if data is from real sensors
function addFreshnessIndicator(isRealSensor) {
    const indicators = document.querySelectorAll('.sensor-card');
    indicators.forEach(card => {
        // Remove existing indicators
        const existingIndicator = card.querySelector('.freshness-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Add new indicator
        const indicator = document.createElement('div');
        indicator.className = 'freshness-indicator';
        indicator.innerHTML = isRealSensor ? 
            '<i class="ri-wireless-charging-line"></i> Live' : 
            '<i class="ri-computer-line"></i> Simulated';
        indicator.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 0.75rem;
            padding: 2px 6px;
            border-radius: 12px;
            background: ${isRealSensor ? '#10b981' : '#f59e0b'};
            color: white;
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        card.style.position = 'relative';
        card.appendChild(indicator);
    });
}

// Update last refresh time
function updateLastRefreshTime() {
    const refreshTimeElement = document.getElementById('lastRefreshTime');
    if (refreshTimeElement) {
        const now = new Date();
        refreshTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    } else {
        // Create refresh time indicator if it doesn't exist
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            const refreshDiv = document.createElement('div');
            refreshDiv.id = 'lastRefreshTime';
            refreshDiv.style.cssText = `
                text-align: center;
                color: #666;
                font-size: 0.9rem;
                margin: 10px 0;
                padding: 5px;
            `;
            refreshDiv.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            mainContent.insertBefore(refreshDiv, mainContent.firstChild);
        }
    }
}

// Auto-refresh sensor data every 30 seconds if location is set
function startAutoRefresh() {
    setInterval(() => {
        if (latitude && longitude) {
            console.log('Auto-refreshing sensor data...');
            fetchSensorData();
        }
    }, 30000); // 30 seconds
}

// Create auto-refresh indicator
function createAutoRefreshIndicator() {
    const existing = document.getElementById('autoRefreshIndicator');
    if (!existing) {
        const indicator = document.createElement('div');
        indicator.id = 'autoRefreshIndicator';
        indicator.className = 'auto-refresh-indicator';
        indicator.innerHTML = `
            <i class="ri-refresh-line"></i>
            <span>Auto-refresh: 30s</span>
        `;
        document.body.appendChild(indicator);
    }
}

// Check if backend is running and accessible
async function checkBackendConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/health', {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            showNotification('Backend connected successfully', 'success');
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        console.error('Backend connection check failed:', error);
        showNotification('Backend server not accessible. Please start the Flask server at http://localhost:5000', 'warning');
    }
}

// Update Recommendations
function updateRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    if (!container) return;
    
    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; grid-column: 1 / -1;">
                <div style="width: 120px; height: 120px; background: linear-gradient(135d, #fef3c7 0%, #fde68a 100%); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; border: 2px solid #f59e0b;">
                    <i class="ri-plant-line" style="font-size: 4rem; color: #d97706;"></i>
                </div>
                <h3 style="color: #1e293b; font-size: 1.5rem; margin-bottom: 1rem; font-weight: 700;">No Recommendations Available</h3>
                <p style="color: #6b7280; font-size: 1.1rem; line-height: 1.6;">Unable to generate crop recommendations for this location. Please try selecting a different area.</p>
            </div>
        `;
        return;
    }

    // Create crop cards with improved formatting
    const cropCards = recommendations.map(crop => {
        // Determine suitability styling based on text value
        let suitabilityClass, suitabilityIcon, suitabilityColor;
        switch(crop.suitability?.toLowerCase()) {
            case 'high':
                suitabilityClass = 'suitability-high';
                suitabilityIcon = 'ri-checkbox-circle-fill';
                suitabilityColor = '#10b981';
                break;
            case 'medium':
                suitabilityClass = 'suitability-medium';
                suitabilityIcon = 'ri-checkbox-circle-line';
                suitabilityColor = '#f59e0b';
                break;
            case 'low':
                suitabilityClass = 'suitability-low';
                suitabilityIcon = 'ri-information-line';
                suitabilityColor = '#ef4444';
                break;
            default:
                suitabilityClass = 'suitability-unknown';
                suitabilityIcon = 'ri-question-line';
                suitabilityColor = '#6b7280';
        }
        
        return `
            <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%); border-radius: 20px; padding: 2rem; border: 1px solid rgba(255, 255, 255, 0.3); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); transition: all 0.3s ease; position: relative; overflow: hidden;" class="crop-card" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 16px 48px rgba(0, 0, 0, 0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 8px 32px rgba(0, 0, 0, 0.1)'">
                
                <!-- Background Pattern -->
                <div style="position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: linear-gradient(135deg, ${suitabilityColor}20 0%, transparent 100%); border-radius: 0 20px 0 100px;"></div>
                
                <!-- Crop Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; position: relative; z-index: 2;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, ${suitabilityColor} 0%, ${suitabilityColor}cc 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem;">
                            <i class="ri-seedling-line"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;">${crop.name}</h3>
                            <div style="font-size: 0.9rem; color: #64748b; margin-top: 0.25rem;">Agricultural Crop</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: ${suitabilityColor}15; border: 1px solid ${suitabilityColor}40; border-radius: 12px; color: ${suitabilityColor};">
                        <i class="${suitabilityIcon}" style="font-size: 1rem;"></i>
                        <span style="font-weight: 600; font-size: 0.9rem;">${crop.suitability} Suitability</span>
                    </div>
                </div>
                
                <!-- Growth Information -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; position: relative; z-index: 2;">
                    <div style="background: rgba(102, 126, 234, 0.1); border-radius: 12px; padding: 1rem; text-align: center; border: 1px solid rgba(102, 126, 234, 0.2);">
                        <i class="ri-time-line" style="font-size: 1.5rem; color: #667eea; margin-bottom: 0.5rem;"></i>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">${crop.growthTime}</div>
                        <div style="font-size: 0.8rem; color: #667eea; font-weight: 500; margin-top: 0.25rem;">Growth Period</div>
                    </div>
                    
                    <div style="background: rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 1rem; text-align: center; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <i class="ri-plant-line" style="font-size: 1.5rem; color: #10b981; margin-bottom: 0.5rem;"></i>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">Recommended</div>
                        <div style="font-size: 0.8rem; color: #10b981; font-weight: 500; margin-top: 0.25rem;">For Your Area</div>
                    </div>
                </div>
                
                <!-- Care Instructions -->
                <div style="position: relative; z-index: 2;">
                    <h4 style="font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ri-lightbulb-line" style="color: #f59e0b;"></i>
                        Care Instructions
                    </h4>
                    <p style="font-size: 0.9rem; color: #64748b; line-height: 1.6; margin: 0; background: rgba(248, 250, 252, 0.8); padding: 1rem; border-radius: 10px; border-left: 3px solid ${suitabilityColor};">
                        ${crop.care_instructions}
                    </p>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; position: relative; z-index: 2;">
                    <button style="flex: 1; padding: 0.75rem 1rem; background: linear-gradient(135deg, ${suitabilityColor} 0%, ${suitabilityColor}cc 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        <i class="ri-information-line"></i>
                        <span>Learn More</span>
                    </button>
                    <button style="padding: 0.75rem; background: rgba(102, 126, 234, 0.1); color: #667eea; border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 10px; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(102, 126, 234, 0.2)'" onmouseout="this.style.background='rgba(102, 126, 234, 0.1)'">
                        <i class="ri-bookmark-line"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cropCards;
}

// Enhanced notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="ri-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="ri-close-line"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        padding: 12px 16px;
        border-radius: 8px;
        background: ${getNotificationColor(type)};
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    console.log(`${type.toUpperCase()}: ${message}`);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle-line';
        case 'error': return 'error-warning-line';
        case 'warning': return 'alert-line';
        default: return 'information-line';
    }
}

function getNotificationColor(type) {
    switch(type) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#3b82f6';
    }
}

// Mobile Menu Handling
function setupMobileMenu() {
    const menuTrigger = document.querySelector('.menu-trigger');
    const mobileClose = document.querySelector('.mobile-close');
    const sidebar = document.querySelector('.sidebar');

    if (menuTrigger && sidebar) {
        menuTrigger.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

    if (mobileClose && sidebar) {
        mobileClose.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !menuTrigger?.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

// Initialize the dashboard with auto-refresh and real-time features
function initializeDashboard() {
    console.log('Initializing AgriTrack Dashboard with real sensor integration...');
    
    // Add auto-refresh indicator
    createAutoRefreshIndicator();
    
    // Start auto-refresh if location is already set
    startAutoRefresh();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            if (latitude && longitude) {
                fetchSensorData();
                showNotification('Refreshing sensor data...', 'info');
            }
        }
    });
    
    // Check backend connection on startup
    checkBackendConnection();
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Initialize map
    initMap();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Event Listeners
    const fetchButton = document.getElementById('fetchData');
    if (fetchButton) {
        fetchButton.addEventListener('click', fetchSensorData);
    }

    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            if (latitude && longitude) {
                fetchSensorData();
            } else {
                showNotification('Please select a location on the map first', 'error');
            }
        });
    }

    // Sort functionality
    const sortButton = document.getElementById('sortBySuitability');
    if (sortButton) {
        sortButton.addEventListener('click', () => {
            const container = document.getElementById('recommendations');
            if (container) {
                const cropCards = [...container.querySelectorAll('.crop-card')];
                if (cropCards.length > 0) {
                    cropCards.sort((a, b) => {
                        const suitabilityA = parseInt(a.querySelector('.suitability-badge').textContent);
                        const suitabilityB = parseInt(b.querySelector('.suitability-badge').textContent);
                        return suitabilityB - suitabilityA;
                    });
                    container.innerHTML = '';
                    cropCards.forEach(card => container.appendChild(card));
                }
            }
        });
    }

    // Start auto-refresh
    startAutoRefresh();

    // Initialize dashboard
    initializeDashboard();

    console.log('Initialization complete');
});

// Export functions for external use
window.AgriTrackDashboard = {
    fetchSensorData,
    updateRecommendations,
    showNotification,
    checkBackendConnection
};
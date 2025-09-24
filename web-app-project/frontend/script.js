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
            throw new Error('Failed to fetch sensor data');
        }

        const data = await response.json();
        
        // Update UI with sensor data
        updateReadings(data);
        updateRecommendations(data.recommendations || []);
        showNotification('Data updated successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to fetch data. Please try again.', 'error');
    } finally {
        updateLoadingStates(false);
    }
}

// Update Loading States
function updateLoadingStates(isLoading) {
    const elements = ['temperature', 'humidity', 'moisture', 'soilType'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (isLoading) {
                element.innerHTML = '<div class="loading-spinner"></div>';
            }
        }
    });

    const fetchButton = document.getElementById('fetchData');
    if (fetchButton) {
        fetchButton.disabled = isLoading;
        fetchButton.innerHTML = isLoading ? 
            '<i class="ri-loader-4-line loading-spinner"></i> Analyzing...' : 
            '<i class="ri-search-eye-line"></i> Analyze Selected Location';
    }
}

// Update Sensor Readings
function updateReadings(data) {
    const tempElement = document.getElementById('temperature');
    const humidElement = document.getElementById('humidity');
    const moistureElement = document.getElementById('moisture');
    const soilElement = document.getElementById('soilType');

    if (tempElement) tempElement.textContent = `${data.temperature}°C`;
    if (humidElement) humidElement.textContent = `${data.humidity}%`;
    if (moistureElement) moistureElement.textContent = `${data.moisture_percent}%`;
    if (soilElement) soilElement.textContent = data.soil_type || 'Unknown';
}

// Update Recommendations
function updateRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    if (!container) return;
    
    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="ri-seedling-line"></i>
                <h3>No Recommendations Available</h3>
                <p>Unable to generate crop recommendations for this location</p>
            </div>
        `;
        return;
    }

    // Create crop cards using the new structure
    const cropCards = recommendations.map(crop => {
        const suitabilityClass = crop.suitability >= 80 ? 'suitability-high' : 
                                crop.suitability >= 60 ? 'suitability-medium' : 'suitability-low';
        
        return `
            <div class="crop-card">
                <div class="crop-header">
                    <div class="crop-name">${crop.name}</div>
                    <div class="suitability-badge ${suitabilityClass}">${crop.suitability}%</div>
                </div>
                <div class="crop-details">
                    <div class="detail-item">
                        <i class="ri-time-line"></i>
                        <span>${crop.growthTime} days</span>
                    </div>
                    <div class="detail-item">
                        <i class="ri-plant-line"></i>
                        <span>Growth Period</span>
                    </div>
                </div>
                <div class="care-instructions">
                    ${crop.care_instructions}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cropCards;
}

// Show Notification
function showNotification(message, type = 'info') {
    // Simple alert for now - you can enhance this later
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(message);
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

    console.log('Initialization complete');
});
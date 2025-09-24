// Global state
let allMarketData = []; // Store all market data
let filteredMarketData = []; // Store filtered data
let isLoading = false;

// Comprehensive list of Indian states for immediate population
const ALL_INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
    "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
    "Lakshadweep"
];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeStatesDropdown(); // Initialize states dropdown immediately
    loadStatesFromAPI(); // Then update with API data
    loadAllMarketData(); // Load market data
    setupEventListeners();
});

// Initialize states dropdown with comprehensive list immediately
function initializeStatesDropdown() {
    const stateFilter = document.getElementById('stateFilter');
    if (stateFilter) {
        stateFilter.innerHTML = '<option value="">All States</option>' +
            ALL_INDIAN_STATES.map(state => `<option value="${state}">${state}</option>`).join('');
    }
}

// Load states from API and update dropdown if we get more comprehensive data
async function loadStatesFromAPI() {
    try {
        const response = await fetch('http://localhost:5000/api/states');
        if (!response.ok) throw new Error('Failed to fetch states');

        const data = await response.json();
        const stateFilter = document.getElementById('stateFilter');
        
        // Only update if we got data from API and it has more states than our fallback
        if (stateFilter && data.states && data.states.length > 10) {
            // Merge API states with our comprehensive list and remove duplicates
            const allStates = [...new Set([...ALL_INDIAN_STATES, ...data.states])].sort();
            stateFilter.innerHTML = '<option value="">All States</option>' +
                allStates.map(state => `<option value="${state}">${state}</option>`).join('');
        }
        
    } catch (error) {
        console.error('Error loading states from API:', error);
        // States dropdown already has fallback data, so no need to do anything
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshMarketData')?.addEventListener('click', () => {
        loadStatesDropdown();
        loadAllMarketData();
    });
    document.getElementById('stateFilter')?.addEventListener('change', handleStateChange);
    document.getElementById('districtFilter')?.addEventListener('change', applyFilters);
    document.getElementById('marketFilter')?.addEventListener('change', applyFilters);
    document.getElementById('commodityFilter')?.addEventListener('input', applyFilters);
    document.getElementById('cropSearch')?.addEventListener('input', applyFilters);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearAllFilters);
    document.getElementById('sortByPriceBtn')?.addEventListener('click', () => sortMarketData('price'));
    document.getElementById('sortByDateBtn')?.addEventListener('click', () => sortMarketData('date'));
}

// Handle state change and load districts
async function handleStateChange(e) {
    const selectedState = e.target.value;
    await loadDistrictsDropdown(selectedState);
    applyFilters();
}

// Load districts dropdown based on selected state
async function loadDistrictsDropdown(state) {
    const districtFilter = document.getElementById('districtFilter');
    if (!districtFilter) return;
    
    districtFilter.innerHTML = '<option value="">All Districts</option>';
    
    if (!state) return;
    
    try {
        const response = await fetch(`http://localhost:5000/api/districts?state=${encodeURIComponent(state)}`);
        if (!response.ok) throw new Error('Failed to fetch districts');

        const data = await response.json();
        
        if (data.districts && data.districts.length > 0) {
            const districtOptions = data.districts.map(district => 
                `<option value="${district}">${district}</option>`
            ).join('');
            districtFilter.innerHTML += districtOptions;
        }
        
    } catch (error) {
        console.error('Error loading districts:', error);
    }
}

// Load all market data from API
async function loadAllMarketData() {
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        // Show loading state
        const container = document.getElementById('marketDataContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-data">
                    <i class="ri-loader-4-line" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; animation: spin 1s linear infinite;"></i>
                    <p>Loading all market data...</p>
                </div>
            `;
        }

        // Single fetch request - backend handles getting more data
        const response = await fetch('http://localhost:5000/api/market-data?limit=100');
        if (!response.ok) throw new Error('Failed to fetch market data');

        const data = await response.json();
        allMarketData = data.records || [];
        filteredMarketData = [...allMarketData]; // Initially show all data
        
        // Populate filter dropdowns with unique values from loaded data
        populateFilterDropdowns();
        
        // Update UI with all data
        updateMarketOverview(filteredMarketData);
        updateMarketDataDisplay(filteredMarketData);
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error loading market data:', error);
        showErrorMessage('Failed to fetch market data. Please try again.');
    } finally {
        isLoading = false;
    }
}

// Populate filter dropdowns with unique values from all data
function populateFilterDropdowns() {
    if (!allMarketData.length) return;
    
    // Get unique markets
    const markets = [...new Set(allMarketData.map(item => item.market).filter(Boolean))].sort();
    const marketFilter = document.getElementById('marketFilter');
    if (marketFilter && markets.length > 0) {
        marketFilter.innerHTML = '<option value="">All Markets</option>' +
            markets.map(market => `<option value="${market}">${market}</option>`).join('');
    }
}

// Apply all filters to the data
function applyFilters() {
    const stateFilter = document.getElementById('stateFilter')?.value || '';
    const districtFilter = document.getElementById('districtFilter')?.value || '';
    const marketFilter = document.getElementById('marketFilter')?.value || '';
    const commodityFilter = document.getElementById('commodityFilter')?.value.toLowerCase() || '';
    const searchTerm = document.getElementById('cropSearch')?.value.toLowerCase() || '';
    
    console.log('=== FILTERING DEBUG ===');
    console.log('Selected filters:', { stateFilter, districtFilter, marketFilter, commodityFilter, searchTerm });
    console.log('Total records before filtering:', allMarketData.length);
    
    if (allMarketData.length > 0) {
        console.log('Sample record structure:', allMarketData[0]);
        console.log('All unique states in data:', [...new Set(allMarketData.map(item => item.state))]);
        console.log('Records with Maharashtra:', allMarketData.filter(item => item.state === 'Maharashtra').length);
    }
    
    filteredMarketData = allMarketData.filter(item => {
        console.log(`Checking record: ${item.commodity} in ${item.state}, ${item.district}`);
        
        // State filter
        if (stateFilter && item.state !== stateFilter) {
            console.log(`Filtered out by state: ${item.state} !== ${stateFilter}`);
            return false;
        }
        
        // District filter
        if (districtFilter && item.district !== districtFilter) {
            console.log(`Filtered out by district: ${item.district} !== ${districtFilter}`);
            return false;
        }
        
        // Market filter
        if (marketFilter && item.market !== marketFilter) {
            console.log(`Filtered out by market: ${item.market} !== ${marketFilter}`);
            return false;
        }
        
        // Commodity filter
        if (commodityFilter && !item.commodity?.toLowerCase().includes(commodityFilter)) {
            console.log(`Filtered out by commodity: ${item.commodity} doesn't contain ${commodityFilter}`);
            return false;
        }
        
        // Search term filter (searches in commodity, variety, and market)
        if (searchTerm) {
            const searchFields = [
                item.commodity?.toLowerCase() || '',
                item.variety?.toLowerCase() || '',
                item.market?.toLowerCase() || ''
            ];
            if (!searchFields.some(field => field.includes(searchTerm))) {
                console.log(`Filtered out by search: ${searchTerm} not found in ${searchFields}`);
                return false;
            }
        }
        
        console.log(`✓ Record passed all filters: ${item.commodity} in ${item.state}`);
        return true;
    });
    
    console.log('Records after filtering:', filteredMarketData.length);
    console.log('=== END FILTERING DEBUG ===');
    
    // Update display with filtered data
    updateMarketOverview(filteredMarketData);
    updateMarketDataDisplay(filteredMarketData);
}

// Clear all filters
function clearAllFilters() {
    document.getElementById('stateFilter').value = '';
    document.getElementById('districtFilter').value = '';
    document.getElementById('marketFilter').value = '';
    document.getElementById('commodityFilter').value = '';
    document.getElementById('cropSearch').value = '';
    
    // Reset districts dropdown
    document.getElementById('districtFilter').innerHTML = '<option value="">All Districts</option>';
    
    // Reset to show all data
    filteredMarketData = [...allMarketData];
    updateMarketOverview(filteredMarketData);
    updateMarketDataDisplay(filteredMarketData);
}

// Update market overview statistics
function updateMarketOverview(data) {
    if (!data || data.length === 0) {
        document.getElementById('totalRecords').textContent = '0 records';
        document.getElementById('avgModalPrice').textContent = '₹0/quintal';
        document.getElementById('highestPrice').textContent = '₹0/quintal';
        document.getElementById('lowestPrice').textContent = '₹0/quintal';
        document.getElementById('totalMarkets').textContent = '0';
        return;
    }
    
    // Calculate statistics
    const prices = data.map(item => parseFloat(item.modal_price || 0)).filter(p => p > 0);
    const avgPrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const uniqueMarkets = [...new Set(data.map(item => item.market))].length;
    
    // Update DOM elements
    document.getElementById('totalRecords').textContent = `${data.length} records`;
    document.getElementById('avgModalPrice').textContent = `₹${avgPrice.toFixed(0)}/quintal`;
    document.getElementById('highestPrice').textContent = `₹${maxPrice.toFixed(0)}/quintal`;
    document.getElementById('lowestPrice').textContent = `₹${minPrice.toFixed(0)}/quintal`;
    document.getElementById('totalMarkets').textContent = uniqueMarkets.toString();
}

// Update market data display
function updateMarketDataDisplay(data) {
    const container = document.getElementById('marketDataContainer');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="ri-database-line" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No market data matches the selected filters.</p>
                <button class="btn btn-secondary" onclick="clearAllFilters()">Clear Filters</button>
            </div>
        `;
        return;
    }
    
    // Create market data cards
    const cardsHTML = data.map(item => createMarketDataCardHTML(item)).join('');
    container.innerHTML = `<div class="market-data-grid">${cardsHTML}</div>`;
}

// Create market data card HTML
function createMarketDataCardHTML(item) {
    const modalPrice = parseFloat(item.modal_price || 0);
    const minPrice = parseFloat(item.min_price || 0);
    const maxPrice = parseFloat(item.max_price || 0);
    
    // Determine price trend
    const priceColor = modalPrice > (minPrice + maxPrice) / 2 ? 'price-high' : 'price-low';
    
    return `
        <div class="market-card">
            <div class="card-header">
                <h3>${item.commodity || 'Unknown'}</h3>
                <span class="variety">${item.variety || 'Common'}</span>
            </div>
            <div class="location">
                <span class="state">${item.state || 'Unknown'}</span> • 
                <span class="district">${item.district || 'Unknown'}</span>
            </div>
            <div class="market-name">${item.market || 'Unknown Market'}</div>
            <div class="price-info">
                <div class="modal-price ${priceColor}">₹${modalPrice.toFixed(0)}</div>
                <div class="price-range">₹${minPrice.toFixed(0)} - ₹${maxPrice.toFixed(0)}</div>
            </div>
            <div class="arrival-info">
                <span class="arrival-date">${formatDate(item.arrival_date)}</span>
                ${item.arrival_qty ? `<span class="arrival-qty">${item.arrival_qty} quintals</span>` : ''}
            </div>
        </div>
    `;
}

// Sort market data
function sortMarketData(sortBy) {
    if (sortBy === 'price') {
        filteredMarketData.sort((a, b) => parseFloat(b.modal_price || 0) - parseFloat(a.modal_price || 0));
    } else if (sortBy === 'date') {
        filteredMarketData.sort((a, b) => {
            const dateA = new Date(a.arrival_date || 0);
            const dateB = new Date(b.arrival_date || 0);
            return dateB - dateA;
        });
    }
    
    updateMarketDataDisplay(filteredMarketData);
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
}

// Show error message
function showErrorMessage(message) {
    const container = document.getElementById('marketDataContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <i class="ri-error-warning-line" style="font-size: 3rem; margin-bottom: 1rem; color: #e74c3c;"></i>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="loadAllMarketData()">Try Again</button>
            </div>
        `;
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Try parsing DD/MM/YYYY format
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parseInt(parts[2]);
                const parsedDate = new Date(year, month, day);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toLocaleDateString('en-IN');
                }
            }
            return dateString;
        }
        return date.toLocaleDateString('en-IN');
    } catch (error) {
        return dateString;
    }
}
// Enhanced Crop Library JavaScript with Market Data Integration
class CropLibrary {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
    }

    setupEventListeners() {
        const form = document.getElementById('locationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    setupMobileMenu() {
        const menuTrigger = document.querySelector('.menu-trigger');
        const mobileClose = document.querySelector('.mobile-close');
        const sidebar = document.querySelector('aside');

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

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const city = document.getElementById('city').value.trim();
        const state = document.getElementById('state').value.trim();
        const country = document.getElementById('country').value.trim();

        if (!city || !state || !country) {
            this.showError('Please fill in all location fields');
            return;
        }

        const location = `${city}, ${state}, ${country}`;
        await this.analyzeCropProfitability(location);
    }

    async analyzeCropProfitability(location) {
        this.showLoading();
        
        try {
            // Call backend API to get enhanced Gemini + Market Data analysis
            const response = await fetch('http://localhost:5000/api/crop-profitability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ location })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.displayEnhancedResults(location, data);
            } else {
                throw new Error(data.error || 'Failed to get crop recommendations');
            }

        } catch (error) {
            console.error('Error analyzing crop profitability:', error);
            this.showError('Unable to analyze crop profitability. Please check your internet connection and try again.');
        }
    }

    showLoading() {
        const resultsSection = document.getElementById('resultsSection');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> <span>AI Analyzing...</span>';
        }

        if (resultsSection) {
            resultsSection.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center;">
                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; border: 2px solid #3b82f6;">
                        <div class="loading-spinner" style="width: 60px; height: 60px;"></div>
                    </div>
                    <h3 style="color: #1e293b; font-size: 1.5rem; margin-bottom: 1rem; font-weight: 700;">AI Analysis in Progress</h3>
                    <p style="color: #6b7280; font-size: 1.1rem; line-height: 1.6; max-width: 600px; margin: 0 0 2rem 0;">
                        Our advanced AI is analyzing climate conditions, soil data, market trends, and government pricing information for your location...
                    </p>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; opacity: 0.8;">
                        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; color: #92400e; font-weight: 600;">
                            <i class="ri-cpu-line"></i> Processing AI Analysis
                        </div>
                        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; color: #1e40af; font-weight: 600;">
                            <i class="ri-database-line"></i> Fetching Market Data
                        </div>
                        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; color: #047857; font-weight: 600;">
                            <i class="ri-line-chart-line"></i> Calculating Profitability
                        </div>
                    </div>
                </div>
            `;
        }
    }

    displayEnhancedResults(location, data) {
        const resultsSection = document.getElementById('resultsSection');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        // Reset button
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="ri-search-eye-line"></i> Analyze Profitability';
        }

        if (!data.recommendations || data.recommendations.length === 0) {
            this.showError('No crop recommendations available for this location');
            return;
        }

        // Create enhanced results HTML with market data integration
        const resultsHTML = `
            <div style="margin-bottom: 3rem;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="display: inline-flex; align-items: center; gap: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 2rem; border-radius: 20px; margin-bottom: 1rem; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);">
                        <i class="ri-plant-line" style="font-size: 2rem;"></i>
                        <div style="text-align: left;">
                            <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">AI Crop Analysis Results</h2>
                            <div style="font-size: 0.9rem; opacity: 0.9;">${location}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem;">
                        ${data.market_data_used ? `
                            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #10b981; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ri-government-line" style="color: #059669;"></i>
                                <span style="color: #047857; font-weight: 600; font-size: 0.85rem;">
                                    ${data.market_records_count} Gov Market Records Used
                                </span>
                            </div>
                        ` : ''}
                        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #f59e0b; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="ri-cpu-line" style="color: #d97706;"></i>
                            <span style="color: #92400e; font-weight: 600; font-size: 0.85rem;">AI-Enhanced Analysis</span>
                        </div>
                        ${data.fallback ? `
                            <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid #3b82f6; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ri-information-line" style="color: #2563eb;"></i>
                                <span style="color: #1e40af; font-weight: 600; font-size: 0.85rem;">Regional Data Used</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem;">
                    ${data.recommendations.map((crop, index) => this.createEnhancedCropCard(crop, index)).join('')}
                </div>
            </div>
        `;

        if (resultsSection) {
            resultsSection.innerHTML = resultsHTML;
        }
    }

    createEnhancedCropCard(crop, index) {
        const profitabilityConfig = this.getProfitabilityConfig(crop.profitability);
        const demandConfig = this.getMarketDemandConfig(crop.market_demand || 'Medium');
        
        return `
            <div style="background: linear-gradient(135deg, ${profitabilityConfig.gradient}); border-radius: 20px; padding: 2rem; border: 2px solid ${profitabilityConfig.borderColor}; box-shadow: 0 12px 40px ${profitabilityConfig.shadowColor}; position: relative; overflow: hidden; transform: translateY(0); transition: all 0.3s ease;" 
                 onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 20px 60px ${profitabilityConfig.shadowColor}'" 
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 12px 40px ${profitabilityConfig.shadowColor}'">
                
                <!-- Card Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 50px; height: 50px; background: ${profitabilityConfig.iconBg}; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: ${profitabilityConfig.iconColor}; font-size: 1.5rem;">
                            <i class="ri-plant-line"></i>
                        </div>
                        <div>
                            <h3 style="font-size: 1.4rem; font-weight: 700; color: #1e293b; margin: 0;">${crop.name}</h3>
                            <div style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Rank #${index + 1} Recommendation</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: ${profitabilityConfig.badgeBg}; color: ${profitabilityConfig.badgeColor}; padding: 0.5rem 1rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="${profitabilityConfig.icon}"></i>
                            ${crop.profitability} Profit
                        </div>
                    </div>
                </div>

                <!-- Price Information -->
                <div style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.5);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <i class="ri-money-rupee-circle-line" style="color: #059669; font-size: 1.25rem;"></i>
                        <h4 style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0;">Market Price Analysis</h4>
                        ${crop.market_data_available ? `
                            <div style="background: #dcfce7; color: #166534; padding: 0.25rem 0.75rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600;">
                                <i class="ri-checkbox-circle-line"></i> Live Data
                            </div>
                        ` : ''}
                    </div>
                    <div style="font-size: 1rem; color: #374151; font-weight: 600; margin-bottom: 0.5rem;">
                        ${crop.price_range || 'Price data updating...'}
                    </div>
                    ${crop.latest_price_date ? `
                        <div style="font-size: 0.85rem; color: #6b7280;">
                            <i class="ri-calendar-line"></i> Updated: ${crop.latest_price_date}
                        </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                        <span style="font-size: 0.9rem; color: #374151; font-weight: 500;">Market Demand:</span>
                        <div style="background: ${demandConfig.bg}; color: ${demandConfig.color}; padding: 0.25rem 0.75rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;">
                            <i class="${demandConfig.icon}"></i>
                            ${crop.market_demand || 'Medium'}
                        </div>
                    </div>
                </div>

                <!-- Crop Details -->
                <div style="background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(10px); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.3);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <i class="ri-information-line" style="color: #3b82f6; font-size: 1.25rem;"></i>
                        <h4 style="font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0;">Why This Crop?</h4>
                    </div>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0; font-size: 0.95rem;">
                        ${crop.details || 'Detailed analysis and recommendations for optimal cultivation.'}
                    </p>
                </div>

                <!-- Decorative Elements -->
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: ${profitabilityConfig.decorativeColor}; border-radius: 50%; opacity: 0.1;"></div>
                <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: ${profitabilityConfig.decorativeColor}; border-radius: 50%; opacity: 0.05;"></div>
            </div>
        `;
    }

    getProfitabilityConfig(profitability) {
        const profit = profitability?.toLowerCase() || 'medium';
        
        if (profit.includes('high')) {
            return {
                gradient: '#d1fae5 0%, #a7f3d0 100%',
                borderColor: '#10b981',
                shadowColor: 'rgba(16, 185, 129, 0.25)',
                iconBg: '#10b981',
                iconColor: 'white',
                badgeBg: '#059669',
                badgeColor: 'white',
                decorativeColor: '#10b981',
                icon: 'ri-arrow-up-line'
            };
        } else if (profit.includes('low')) {
            return {
                gradient: '#fee2e2 0%, #fecaca 100%',
                borderColor: '#ef4444',
                shadowColor: 'rgba(239, 68, 68, 0.25)',
                iconBg: '#ef4444',
                iconColor: 'white',
                badgeBg: '#dc2626',
                badgeColor: 'white',
                decorativeColor: '#ef4444',
                icon: 'ri-arrow-down-line'
            };
        } else {
            return {
                gradient: '#fef3c7 0%, #fde68a 100%',
                borderColor: '#f59e0b',
                shadowColor: 'rgba(245, 158, 11, 0.25)',
                iconBg: '#f59e0b',
                iconColor: 'white',
                badgeBg: '#d97706',
                badgeColor: 'white',
                decorativeColor: '#f59e0b',
                icon: 'ri-subtract-line'
            };
        }
    }

    getMarketDemandConfig(demand) {
        const demandLevel = demand?.toLowerCase() || 'medium';
        
        if (demandLevel.includes('high')) {
            return {
                bg: '#dcfce7',
                color: '#166534',
                icon: 'ri-arrow-up-line'
            };
        } else if (demandLevel.includes('low')) {
            return {
                bg: '#fee2e2',
                color: '#991b1b',
                icon: 'ri-arrow-down-line'
            };
        } else {
            return {
                bg: '#fef3c7',
                color: '#92400e',
                icon: 'ri-subtract-line'
            };
        }
    }

    showError(message) {
        const resultsSection = document.getElementById('resultsSection');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        // Reset button
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="ri-search-eye-line"></i> Analyze Profitability';
        }

        if (resultsSection) {
            resultsSection.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center;">
                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 2rem; border: 2px solid #ef4444;">
                        <i class="ri-error-warning-line" style="font-size: 4rem; color: #dc2626;"></i>
                    </div>
                    <h3 style="color: #1e293b; font-size: 1.5rem; margin-bottom: 1rem; font-weight: 700;">Analysis Failed</h3>
                    <p style="color: #6b7280; font-size: 1.1rem; line-height: 1.6; max-width: 500px; margin: 0;">${message}</p>
                    <button onclick="location.reload()" style="margin-top: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                        <i class="ri-refresh-line"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CropLibrary();
});
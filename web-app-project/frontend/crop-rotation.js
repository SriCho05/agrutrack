// Crop Rotation Planner - Smart recommendations based on climate data
class CropRotationPlanner {
    constructor() {
        this.rainfallData = [];
        this.temperatureData = [];
        this.currentMonth = new Date().getMonth(); // 0-11
        this.currentYear = new Date().getFullYear();
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        
        this.cropDatabase = {
            kharif: [
                {
                    name: 'Rice',
                    icon: '🌾',
                    plantingMonths: [5, 6, 7], // Jun-Aug
                    harvestMonths: [9, 10, 11], // Oct-Dec
                    minRainfall: 150,
                    maxRainfall: 400,
                    minTemp: 20,
                    maxTemp: 35,
                    waterRequirement: 'High',
                    duration: '120-150 days',
                    benefits: ['Nitrogen fixation', 'Soil fertility improvement']
                },
                {
                    name: 'Maize',
                    icon: '🌽',
                    plantingMonths: [5, 6, 7],
                    harvestMonths: [9, 10],
                    minRainfall: 50,
                    maxRainfall: 300,
                    minTemp: 18,
                    maxTemp: 32,
                    waterRequirement: 'Medium',
                    duration: '90-120 days',
                    benefits: ['Deep rooting', 'Soil structure improvement']
                },
                {
                    name: 'Cotton',
                    icon: '🌱',
                    plantingMonths: [4, 5, 6],
                    harvestMonths: [10, 11, 0],
                    minRainfall: 60,
                    maxRainfall: 250,
                    minTemp: 21,
                    maxTemp: 30,
                    waterRequirement: 'Medium',
                    duration: '180-200 days',
                    benefits: ['Cash crop', 'Long duration coverage']
                },
                {
                    name: 'Sugarcane',
                    icon: '🎋',
                    plantingMonths: [1, 2, 3, 10, 11],
                    harvestMonths: [0, 1, 2, 3],
                    minRainfall: 100,
                    maxRainfall: 400,
                    minTemp: 20,
                    maxTemp: 35,
                    waterRequirement: 'Very High',
                    duration: '12-18 months',
                    benefits: ['Perennial crop', 'High biomass production']
                }
            ],
            rabi: [
                {
                    name: 'Wheat',
                    icon: '🌾',
                    plantingMonths: [10, 11, 0],
                    harvestMonths: [3, 4, 5],
                    minRainfall: 30,
                    maxRainfall: 100,
                    minTemp: 10,
                    maxTemp: 25,
                    waterRequirement: 'Medium',
                    duration: '120-150 days',
                    benefits: ['Cool season crop', 'High protein content']
                },
                {
                    name: 'Barley',
                    icon: '🌾',
                    plantingMonths: [10, 11, 0],
                    harvestMonths: [3, 4],
                    minRainfall: 25,
                    maxRainfall: 80,
                    minTemp: 8,
                    maxTemp: 22,
                    waterRequirement: 'Low',
                    duration: '90-120 days',
                    benefits: ['Drought tolerant', 'Soil conservation']
                },
                {
                    name: 'Mustard',
                    icon: '🌻',
                    plantingMonths: [9, 10, 11],
                    harvestMonths: [2, 3, 4],
                    minRainfall: 25,
                    maxRainfall: 80,
                    minTemp: 10,
                    maxTemp: 25,
                    waterRequirement: 'Low',
                    duration: '90-120 days',
                    benefits: ['Oilseed crop', 'Pest deterrent properties']
                },
                {
                    name: 'Chickpea',
                    icon: '🫘',
                    plantingMonths: [9, 10, 11],
                    harvestMonths: [2, 3, 4],
                    minRainfall: 30,
                    maxRainfall: 90,
                    minTemp: 15,
                    maxTemp: 30,
                    waterRequirement: 'Low',
                    duration: '90-120 days',
                    benefits: ['Nitrogen fixation', 'Protein rich', 'Drought tolerant']
                }
            ],
            zaid: [
                {
                    name: 'Watermelon',
                    icon: '🍉',
                    plantingMonths: [1, 2, 3],
                    harvestMonths: [4, 5, 6],
                    minRainfall: 40,
                    maxRainfall: 120,
                    minTemp: 18,
                    maxTemp: 35,
                    waterRequirement: 'Medium',
                    duration: '90-100 days',
                    benefits: ['High value crop', 'Heat tolerant']
                },
                {
                    name: 'Cucumber',
                    icon: '🥒',
                    plantingMonths: [1, 2, 3],
                    harvestMonths: [4, 5, 6],
                    minRainfall: 35,
                    maxRainfall: 100,
                    minTemp: 18,
                    maxTemp: 30,
                    waterRequirement: 'Medium',
                    duration: '60-70 days',
                    benefits: ['Quick growing', 'High market value']
                },
                {
                    name: 'Fodder Crops',
                    icon: '🌿',
                    plantingMonths: [1, 2, 3],
                    harvestMonths: [4, 5, 6],
                    minRainfall: 30,
                    maxRainfall: 150,
                    minTemp: 15,
                    maxTemp: 35,
                    waterRequirement: 'Medium',
                    duration: '60-90 days',
                    benefits: ['Livestock feed', 'Soil improvement', 'Quick harvest']
                }
            ]
        };

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.updateCurrentMonthInfo();
            this.analyzeClimate();
            this.generateRecommendations();
            this.buildRotationTimeline();
        } catch (error) {
            console.error('Error initializing crop rotation planner:', error);
            this.showError('Failed to load climate data. Please check your connection and try again.');
        }
    }

    async loadData() {
        try {
            // Load rainfall data
            const rainfallResponse = await fetch('../rainfall.csv');
            const rainfallText = await rainfallResponse.text();
            this.rainfallData = this.parseCSV(rainfallText);

            // Load temperature data
            const temperatureResponse = await fetch('../temperature.csv');
            const temperatureText = await temperatureResponse.text();
            this.temperatureData = this.parseCSV(temperatureText);

            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading CSV data:', error);
            throw error;
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            data.push(row);
        }

        return data;
    }

    updateCurrentMonthInfo() {
        const currentMonthName = this.monthNames[this.currentMonth];
        const currentDate = new Date();
        
        document.getElementById('currentMonth').textContent = 
            `${currentMonthName} ${this.currentYear}`;
        
        const seasonInfo = this.getSeasonInfo(this.currentMonth);
        document.getElementById('monthDescription').textContent = 
            `${seasonInfo.description} - Optimal time for ${seasonInfo.activities}`;
    }

    getSeasonInfo(month) {
        if (month >= 5 && month <= 9) {
            return {
                season: 'Kharif',
                description: 'Monsoon season with high rainfall',
                activities: 'rice, maize, cotton cultivation'
            };
        } else if (month >= 10 || month <= 2) {
            return {
                season: 'Rabi',
                description: 'Winter season with moderate temperatures',
                activities: 'wheat, barley, mustard cultivation'
            };
        } else {
            return {
                season: 'Zaid',
                description: 'Summer season with high temperatures',
                activities: 'irrigation-based crops and vegetables'
            };
        }
    }

    analyzeClimate() {
        const currentMonthAbbr = this.monthAbbr[this.currentMonth];
        
        // Calculate average rainfall for current month over recent years
        const recentYears = this.rainfallData.slice(-10); // Last 10 years
        let totalRainfall = 0;
        let validYears = 0;

        recentYears.forEach(row => {
            const rainfall = parseFloat(row[currentMonthAbbr]);
            if (!isNaN(rainfall)) {
                totalRainfall += rainfall;
                validYears++;
            }
        });

        const avgRainfall = validYears > 0 ? (totalRainfall / validYears).toFixed(1) : 0;

        // Calculate average temperature for current month
        const tempRecentYears = this.temperatureData.slice(-10);
        let totalTemp = 0;
        let validTempYears = 0;

        // Get seasonal temperature (since monthly breakdown isn't available)
        const seasonCol = this.getTemperatureColumn(this.currentMonth);
        tempRecentYears.forEach(row => {
            const temp = parseFloat(row[seasonCol]);
            if (!isNaN(temp)) {
                totalTemp += temp;
                validTempYears++;
            }
        });

        const avgTemp = validTempYears > 0 ? (totalTemp / validTempYears).toFixed(1) : 0;

        // Determine season and suitability
        const seasonInfo = this.getSeasonInfo(this.currentMonth);
        const suitabilityScore = this.calculateSuitabilityScore(avgRainfall, avgTemp, this.currentMonth);

        // Update UI
        document.getElementById('avgRainfall').textContent = avgRainfall;
        document.getElementById('avgTemperature').textContent = avgTemp;
        document.getElementById('seasonType').innerHTML = `
            <i class="fas fa-leaf"></i>
            <span>${seasonInfo.season}</span>
        `;
        document.getElementById('suitabilityScore').textContent = suitabilityScore.toFixed(1);
    }

    getTemperatureColumn(month) {
        if (month >= 0 && month <= 1) return 'JAN-FEB';
        if (month >= 2 && month <= 4) return 'MAR-MAY';
        if (month >= 5 && month <= 8) return 'JUN-SEP';
        if (month >= 9 && month <= 11) return 'OCT-DEC';
        return 'ANNUAL';
    }

    calculateSuitabilityScore(rainfall, temperature, month) {
        let score = 5; // Base score

        // Rainfall scoring
        if (rainfall > 200) score += 2;
        else if (rainfall > 100) score += 1;
        else if (rainfall < 30) score -= 1;

        // Temperature scoring
        if (temperature >= 20 && temperature <= 30) score += 2;
        else if (temperature >= 15 && temperature <= 35) score += 1;
        else score -= 1;

        // Seasonal appropriateness
        const season = this.getSeasonInfo(month).season;
        if ((season === 'Kharif' && rainfall > 100) ||
            (season === 'Rabi' && temperature < 25) ||
            (season === 'Zaid' && temperature > 25)) {
            score += 1;
        }

        return Math.max(0, Math.min(10, score));
    }

    generateRecommendations() {
        const currentMonthAbbr = this.monthAbbr[this.currentMonth];
        const recentRainfall = this.getRecentAverage('rainfall', currentMonthAbbr);
        const recentTemp = this.getRecentAverage('temperature', this.getTemperatureColumn(this.currentMonth));

        const categoriesContainer = document.getElementById('cropCategories');
        categoriesContainer.innerHTML = '';

        Object.keys(this.cropDatabase).forEach(category => {
            const crops = this.cropDatabase[category];
            const suitableCrops = crops.filter(crop => 
                this.isCropSuitable(crop, this.currentMonth, recentRainfall, recentTemp)
            );

            if (suitableCrops.length > 0) {
                const categoryElement = this.createCategoryElement(category, suitableCrops, recentRainfall, recentTemp);
                categoriesContainer.appendChild(categoryElement);
            }
        });

        if (categoriesContainer.children.length === 0) {
            categoriesContainer.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Limited Recommendations</h3>
                    <p>Current climate conditions are challenging for most crops. Consider soil preparation or irrigation planning.</p>
                </div>
            `;
        }
    }

    getRecentAverage(type, column) {
        const data = type === 'rainfall' ? this.rainfallData : this.temperatureData;
        const recentYears = data.slice(-5);
        let total = 0;
        let count = 0;

        recentYears.forEach(row => {
            const value = parseFloat(row[column]);
            if (!isNaN(value)) {
                total += value;
                count++;
            }
        });

        return count > 0 ? total / count : 0;
    }

    isCropSuitable(crop, month, rainfall, temperature) {
        // Check if current month is suitable for planting
        const isPlantingMonth = crop.plantingMonths.includes(month);
        const isHarvestMonth = crop.harvestMonths.includes(month);
        
        if (!isPlantingMonth && !isHarvestMonth) return false;

        // Check climate suitability
        const rainfallSuitable = rainfall >= crop.minRainfall && rainfall <= crop.maxRainfall;
        const tempSuitable = temperature >= crop.minTemp && temperature <= crop.maxTemp;

        return rainfallSuitable && tempSuitable;
    }

    createCategoryElement(category, crops, rainfall, temperature) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'crop-category';

        const categoryNames = {
            kharif: 'Kharif Crops (Monsoon)',
            rabi: 'Rabi Crops (Winter)',
            zaid: 'Zaid Crops (Summer)'
        };

        categoryDiv.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">
                    <i class="fas fa-${this.getCategoryIcon(category)}"></i>
                    ${categoryNames[category]}
                </h3>
                <span class="category-badge">${crops.length} Recommended</span>
            </div>
            <div class="crops-grid">
                ${crops.map(crop => this.createCropCard(crop, category, rainfall, temperature)).join('')}
            </div>
        `;

        return categoryDiv;
    }

    getCategoryIcon(category) {
        const icons = {
            kharif: 'cloud-rain',
            rabi: 'snowflake',
            zaid: 'sun'
        };
        return icons[category] || 'seedling';
    }

    createCropCard(crop, category, rainfall, temperature) {
        const suitability = this.calculateCropSuitability(crop, rainfall, temperature);
        const stars = this.generateStars(suitability);
        
        const isPlanting = crop.plantingMonths.includes(this.currentMonth);
        const activity = isPlanting ? 'Planting Season' : 'Harvest Season';

        return `
            <div class="crop-card">
                <div class="crop-header">
                    <div class="crop-icon ${category}">
                        ${crop.icon}
                    </div>
                    <div class="crop-info">
                        <h4>${crop.name}</h4>
                        <span class="crop-timing">${activity}</span>
                    </div>
                </div>
                <div class="crop-details">
                    <div class="crop-detail">
                        <i class="fas fa-clock"></i>
                        <span>Duration: ${crop.duration}</span>
                    </div>
                    <div class="crop-detail">
                        <i class="fas fa-tint"></i>
                        <span>Water: ${crop.waterRequirement}</span>
                    </div>
                    <div class="crop-detail">
                        <i class="fas fa-leaf"></i>
                        <span>${crop.benefits[0]}</span>
                    </div>
                </div>
                <div class="suitability-score">
                    <span class="score-label">Suitability</span>
                    <div class="score-value">
                        <div class="score-stars">${stars}</div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateCropSuitability(crop, rainfall, temperature) {
        let score = 0;

        // Rainfall score (0-2.5 points)
        const rainfallMid = (crop.minRainfall + crop.maxRainfall) / 2;
        const rainfallRange = crop.maxRainfall - crop.minRainfall;
        const rainfallDeviation = Math.abs(rainfall - rainfallMid) / rainfallRange;
        score += Math.max(0, 2.5 - (rainfallDeviation * 2.5));

        // Temperature score (0-2.5 points)
        const tempMid = (crop.minTemp + crop.maxTemp) / 2;
        const tempRange = crop.maxTemp - crop.minTemp;
        const tempDeviation = Math.abs(temperature - tempMid) / tempRange;
        score += Math.max(0, 2.5 - (tempDeviation * 2.5));

        return Math.min(5, Math.max(0, score));
    }

    generateStars(score) {
        const fullStars = Math.floor(score);
        const halfStar = score % 1 >= 0.5 ? 1 : 0;
        const emptyStars = 5 - fullStars - halfStar;

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star star"></i>';
        }
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt star"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star star empty"></i>';
        }

        return stars;
    }

    buildRotationTimeline() {
        const timeline = document.getElementById('rotationTimeline');
        timeline.innerHTML = '';

        const timelineData = this.generateTimelineData();
        
        timelineData.forEach((monthData, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';

            const markerClass = this.getMarkerClass(monthData.month);
            
            timelineItem.innerHTML = `
                <div class="timeline-marker ${markerClass}">
                    ${monthData.month + 1}
                </div>
                <div class="timeline-content">
                    <div class="timeline-month">${this.monthNames[monthData.month]}</div>
                    <div class="timeline-activities">
                        ${monthData.activities.map(activity => `
                            <div class="timeline-activity">
                                <i class="fas fa-${activity.icon}"></i>
                                <span>${activity.text}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            timeline.appendChild(timelineItem);
        });
    }

    generateTimelineData() {
        const timeline = [];
        
        for (let month = 0; month < 12; month++) {
            const activities = [];
            
            // Check each crop category for activities this month
            Object.keys(this.cropDatabase).forEach(category => {
                this.cropDatabase[category].forEach(crop => {
                    if (crop.plantingMonths.includes(month)) {
                        activities.push({
                            icon: 'seedling',
                            text: `Plant ${crop.name}`
                        });
                    }
                    if (crop.harvestMonths.includes(month)) {
                        activities.push({
                            icon: 'cut',
                            text: `Harvest ${crop.name}`
                        });
                    }
                });
            });

            // Add general farming activities
            if (month === 2 || month === 3) {
                activities.push({
                    icon: 'tractor',
                    text: 'Soil preparation and plowing'
                });
            }
            if (month === 4 || month === 5) {
                activities.push({
                    icon: 'tint',
                    text: 'Irrigation system check'
                });
            }

            timeline.push({
                month: month,
                activities: activities.length > 0 ? activities : [{
                    icon: 'pause',
                    text: 'Field maintenance and planning'
                }]
            });
        }

        return timeline;
    }

    getMarkerClass(month) {
        if (month === this.currentMonth) return 'current';
        if (month < this.currentMonth) return 'past';
        return 'future';
    }

    showError(message) {
        const container = document.getElementById('cropCategories');
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the crop rotation planner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CropRotationPlanner();
});
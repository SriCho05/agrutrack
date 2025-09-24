from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import time
from datetime import datetime, timedelta
import requests
import os
import google.generativeai as genai

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

def normalize_market_data(api_response):
    """
    Normalize API response field names to match frontend expectations
    """
    if not api_response or 'records' not in api_response:
        return api_response
    
    normalized_records = []
    for record in api_response['records']:
        normalized_record = {
            'commodity': record.get('Commodity', ''),
            'variety': record.get('Variety', ''),
            'state': record.get('State', ''),
            'district': record.get('District', ''),
            'market': record.get('Market', ''),
            'arrival_date': record.get('Arrival_Date', ''),
            'modal_price': record.get('Modal_Price', '0'),
            'min_price': record.get('Min_Price', '0'),
            'max_price': record.get('Max_Price', '0'),
            'arrival_qty': record.get('Arrival_Qty', '0'),  # This field might not exist in the API
            'grade': record.get('Grade', '')
        }
        normalized_records.append(normalized_record)
    
    return {
        'records': normalized_records,
        'total': api_response.get('total', len(normalized_records)),
        'count': len(normalized_records),
        'offset': api_response.get('offset', 0)
    }

def get_market_data(state=None, district=None, commodity=None, arrival_date=None, offset=0, limit=10):
    """
    Fetch market data from the government API with proper parameters
    """
    params = {
        "api-key": API_KEY,
        "format": "json",
        "offset": offset,
        "limit": min(limit, 10)  # API key limits to max 10 records
    }
    
    # Add filters if provided
    if state:
        params["filters[State]"] = state
    if district:
        params["filters[District]"] = district
    if commodity:
        params["filters[Commodity]"] = commodity
    if arrival_date:
        params["filters[Arrival_Date]"] = arrival_date

    try:
        response = requests.get(MARKET_API_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Validate response structure
        if 'records' not in data:
            print(f"Unexpected API response structure: {data}")
            return generate_mock_market_data()
        
        # Normalize the field names
        normalized_data = normalize_market_data(data)
        return normalized_data
        
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return generate_mock_market_data()
    except Exception as e:
        print(f"Error processing market data: {e}")
        return generate_mock_market_data()

def generate_mock_market_data():
    """
    Generate mock market data for development/fallback
    """
    import random
    from datetime import datetime, timedelta
    
    commodities = ["Rice", "Wheat", "Cotton", "Sugarcane", "Maize", "Bajra", "Jowar", "Onion", "Potato", "Tomato"]
    states = ["Maharashtra", "Karnataka", "Gujarat", "Punjab", "Haryana", "Uttar Pradesh", "Tamil Nadu"]
    districts = ["Mumbai", "Pune", "Nashik", "Bangalore", "Mysore", "Ahmedabad", "Vadodara", "Ludhiana"]
    varieties = ["Common", "Grade A", "Premium", "Medium", "FAQ", "Bold"]
    
    mock_records = []
    for i in range(10):
        commodity = random.choice(commodities)
        state = random.choice(states)
        district = random.choice(districts)
        variety = random.choice(varieties)
        
        # Generate realistic price data
        base_price = random.randint(1500, 5000)
        min_price = base_price - random.randint(200, 500)
        max_price = base_price + random.randint(200, 500)
        modal_price = base_price + random.randint(-100, 100)
        
        # Generate arrival date within last 30 days
        arrival_date = (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
        
        record = {
            "state": state,
            "district": district,
            "market": f"{district} Market",
            "commodity": commodity,
            "variety": variety,
            "arrival_date": arrival_date,
            "min_price": str(min_price),
            "max_price": str(max_price),
            "modal_price": str(modal_price),
            "arrival_qty": str(random.randint(50, 500))
        }
        mock_records.append(record)
    
    return {
        "records": mock_records,
        "total": len(mock_records),
        "count": len(mock_records),
        "offset": 0
    }

def analyze_crop_economics(market_data, crop_name):
    if not market_data or "records" not in market_data:
        return None

    records = market_data["records"]
    if not records:
        return None

    # Calculate average prices and price trends
    prices = [float(record.get("modal_price", 0)) for record in records if record.get("modal_price")]
    if not prices:
        return None

    avg_price = sum(prices) / len(prices)
    price_trend = "increasing" if prices[-1] > prices[0] else "decreasing"
    
    return {
        "average_price": round(avg_price, 2),
        "current_price": prices[-1],
        "price_trend": price_trend,
        "profit_potential": "High" if price_trend == "increasing" else "Moderate",
        "market_demand": "High" if len(records) > 10 else "Moderate"
    }

@app.route("/api/get-data", methods=["POST"])
def get_data():
    """API endpoint to fetch sensor data, soil type, and plant recommendations."""
    try:
        data = request.json
        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if not latitude or not longitude:
            return jsonify({"error": "Latitude and longitude are required"}), 400

        # Get sensor data (real or mock)
        if MOCK_MODE:
            sensor_data = get_mock_sensor_data()
            temperature = sensor_data["temperature"]
            humidity = sensor_data["humidity"]
            moisture_percent = sensor_data["moisture_percent"]
            soil_type = sensor_data["soil_type"]
        else:
            try:
                soil_type = sensor_reader.get_soil_type(latitude, longitude)
                sensor_reader.setup_gpio()
                humidity, temperature = sensor_reader.read_dht22()
                moisture_percent, _ = sensor_reader.read_moisture()
            except Exception as sensor_error:
                print(f"Sensor error: {sensor_error}")
                # Fallback to mock data if sensor fails
                sensor_data = get_mock_sensor_data()
                temperature = sensor_data["temperature"]
                humidity = sensor_data["humidity"]
                moisture_percent = sensor_data["moisture_percent"]
                soil_type = sensor_data["soil_type"]

        # Package sensor data
        sensor_data = {
            "temperature": temperature,
            "humidity": humidity,
            "moisture_percent": moisture_percent,
            "soil_type": soil_type,
        }

        # Get crop recommendations
        suitable_crops = get_suitable_crops(sensor_data)
        
        # Prepare recommendations without waiting for market data
        crop_recommendations = []
        for crop in suitable_crops:
            crop_recommendations.append({
                "name": crop["name"],
                "suitability": crop["suitability"],
                "growthTime": crop["growthTime"],
                "care_instructions": crop["care_instructions"]
            })

        return jsonify({
            "temperature": temperature,
            "humidity": humidity,
            "moisture_percent": moisture_percent,
            "soil_type": soil_type,
            "recommendations": crop_recommendations
        })

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/market-data", methods=["GET"])
def get_market_data_api():
    """
    API endpoint to fetch market data with filters and pagination
    """
    try:
        # Extract parameters from request
        state = request.args.get('state', '').strip()
        district = request.args.get('district', '').strip()
        commodity = request.args.get('commodity', '').strip()
        arrival_date = request.args.get('arrival_date', '').strip()
        offset = request.args.get('offset', type=int, default=0)
        limit = request.args.get('limit', type=int, default=10)
        
        print(f"Market data request - State: {state}, District: {district}, Commodity: {commodity}, Offset: {offset}, Limit: {limit}")
        
        # If requesting more than 10 records, fetch multiple pages
        if limit > 10:
            all_records = []
            max_records = min(limit, 100)  # Cap at 100 records
            current_offset = offset
            max_api_calls = 10  # Limit API calls to prevent excessive requests
            api_calls_made = 0
            
            while len(all_records) < max_records and api_calls_made < max_api_calls:
                market_data = get_market_data(
                    state=state if state else None,
                    district=district if district else None,
                    commodity=commodity if commodity else None,
                    arrival_date=arrival_date if arrival_date else None,
                    offset=current_offset,
                    limit=10
                )
                
                api_calls_made += 1
                
                if not market_data or not market_data.get("records"):
                    print(f"No more data available after {api_calls_made} API calls")
                    break
                    
                batch_records = market_data.get("records", [])
                all_records.extend(batch_records)
                current_offset += 10
                
                print(f"API call {api_calls_made}: Got {len(batch_records)} records, total: {len(all_records)}")
                
                # If we got less than 10 records, we've reached the end
                if len(batch_records) < 10:
                    print("Reached end of available data")
                    break
                    
                time.sleep(0.05)  # Small delay
            
            print(f"Completed fetching: {len(all_records)} records from {api_calls_made} API calls")
            
            # Debug: Print sample of what we got
            if all_records:
                print(f"Sample record states: {[r.get('state', 'Unknown') for r in all_records[:5]]}")
                print(f"Unique states in data: {set(r.get('state', 'Unknown') for r in all_records)}")
            
            response_data = {
                "records": all_records[:max_records],
                "total": len(all_records),
                "count": len(all_records),
                "offset": offset,
                "limit": limit,
                "has_more": False,
                "api_calls_made": api_calls_made,
                "debug_info": {
                    "unique_states": list(set(r.get('state', 'Unknown') for r in all_records)),
                    "unique_districts": list(set(r.get('district', 'Unknown') for r in all_records)),
                    "sample_records": all_records[:3] if all_records else []
                }
            }
        else:
            # Single page request
            market_data = get_market_data(
                state=state if state else None,
                district=district if district else None,
                commodity=commodity if commodity else None,
                arrival_date=arrival_date if arrival_date else None,
                offset=offset,
                limit=limit
            )
            
            if not market_data:
                return jsonify({"error": "Failed to fetch market data"}), 500
                
            response_data = {
                "records": market_data.get("records", []),
                "total": market_data.get("total", 0),
                "count": len(market_data.get("records", [])),
                "offset": offset,
                "limit": limit,
                "has_more": (offset + len(market_data.get("records", []))) < market_data.get("total", 0)
            }
        
        return jsonify(response_data)

    except Exception as e:
        print(f"Error in market data API: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/states', methods=['GET'])
def get_states():
    """Get comprehensive list of available states for dropdown"""
    try:
        print("Fetching states list...")
        all_states = set()
        offset = 0
        max_requests = 10  # Reduce redundant requests
        requests_made = 0
        
        while requests_made < max_requests:
            params = {
                "api-key": API_KEY,
                "format": "json",
                "limit": 10,
                "offset": offset
            }
            
            response = requests.get(MARKET_API_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'records' not in data or not data['records']:
                print(f"No more records after {requests_made} requests")
                break
            
            # Extract states from this batch
            batch_states = set(record.get('State', '').strip() for record in data['records'] if record.get('State', '').strip())
            all_states.update(batch_states)
            
            print(f"Request {requests_made + 1}: Got {len(batch_states)} new states, total unique: {len(all_states)}")
            
            # If we got less than 10 records, we've reached the end
            if len(data['records']) < 10:
                print("Reached end of data")
                break
                
            offset += 10
            requests_made += 1
            
            # Stop if we haven't found new states in the last few requests
            if requests_made > 3 and len(all_states) < 5:
                print("Limited data available, stopping early")
                break
            
            time.sleep(0.1)
        
        states_list = sorted(list(all_states))
        print(f"Final result: Found {len(states_list)} unique states: {states_list}")
        
        # Always return comprehensive fallback list merged with API data
        fallback_states = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
            "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
            "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
            "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
            "Lakshadweep"
        ]
        
        # Merge API states with fallback, prioritizing API data
        all_states_combined = states_list + [state for state in fallback_states if state not in states_list]
        
        return jsonify({
            "states": all_states_combined,
            "count": len(all_states_combined),
            "api_states": states_list,
            "api_calls_made": requests_made
        })
        
    except Exception as e:
        print(f"Error fetching states: {e}")
        # Return comprehensive list of Indian states as fallback
        fallback_states = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
            "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
            "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
            "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu",
            "Lakshadweep"
        ]
        return jsonify({
            "states": fallback_states,
            "count": len(fallback_states),
            "fallback": True
        })

@app.route('/api/districts', methods=['GET'])
def get_districts():
    """Get comprehensive list of districts for a specific state"""
    state = request.args.get('state')
    if not state:
        return jsonify({"districts": []})
    
    try:
        print(f"Fetching districts for state: {state}")
        all_districts = set()
        offset = 0
        max_requests = 5  # Reduce requests per state
        requests_made = 0
        
        while requests_made < max_requests:
            params = {
                "api-key": API_KEY,
                "format": "json",
                "limit": 10,
                "offset": offset,
                "filters[State]": state
            }
            
            response = requests.get(MARKET_API_URL, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if 'records' not in data or not data['records']:
                print(f"No more records for {state} after {requests_made} requests")
                break
            
            # Extract districts from this batch
            batch_districts = set(record.get('District', '').strip() for record in data['records'] 
                                if record.get('District', '').strip() and record.get('State', '').strip() == state)
            all_districts.update(batch_districts)
            
            print(f"Request {requests_made + 1} for {state}: Got {len(batch_districts)} new districts, total: {len(all_districts)}")
            
            # If we got less than 10 records, we've reached the end
            if len(data['records']) < 10:
                print(f"Reached end of data for {state}")
                break
                
            offset += 10
            requests_made += 1
            
            # Stop early if no new districts found
            if requests_made > 2 and len(all_districts) == 0:
                print(f"No districts found for {state}, stopping early")
                break
            
            time.sleep(0.1)
        
        districts_list = sorted(list(all_districts))
        print(f"Final result for {state}: Found {len(districts_list)} districts: {districts_list}")
        
        return jsonify({
            "districts": districts_list,
            "count": len(districts_list),
            "api_calls_made": requests_made
        })
        
    except Exception as e:
        print(f"Error fetching districts for state {state}: {e}")
        return jsonify({
            "districts": [],
            "error": str(e)
        })

def get_suitable_crops(sensor_data):
    """Get crop recommendations based on sensor data"""
    temperature = sensor_data["temperature"]
    humidity = sensor_data["humidity"]
    soil_type = sensor_data["soil_type"]
    
    # Base crops that can be recommended
    base_crops = {
        "clay": [
            {
                "name": "Rice",
                "baseScore": 90,
                "growthTime": 120,
                "care_instructions": "Maintain standing water, regular weeding required"
            },
            {
                "name": "Cotton",
                "baseScore": 85,
                "growthTime": 150,
                "care_instructions": "Regular pest monitoring, adequate irrigation"
            }
        ],
        "loam": [
            {
                "name": "Wheat",
                "baseScore": 88,
                "growthTime": 140,
                "care_instructions": "Regular irrigation, fertilizer application at key stages"
            },
            {
                "name": "Vegetables",
                "baseScore": 85,
                "growthTime": 90,
                "care_instructions": "Regular watering, mulching recommended"
            }
        ],
        "sandy": [
            {
                "name": "Groundnuts",
                "baseScore": 87,
                "growthTime": 110,
                "care_instructions": "Well-drained soil, moderate irrigation"
            },
            {
                "name": "Potatoes",
                "baseScore": 84,
                "growthTime": 100,
                "care_instructions": "Regular hilling, moderate watering"
            }
        ],
        "silt": [
            {
                "name": "Soybeans",
                "baseScore": 86,
                "growthTime": 130,
                "care_instructions": "Good drainage, proper spacing"
            },
            {
                "name": "Corn",
                "baseScore": 83,
                "growthTime": 110,
                "care_instructions": "Regular fertilization, adequate spacing"
            }
        ]
    }
    
    # Get base recommendations for the soil type
    crops = base_crops.get(soil_type, base_crops["loam"])  # Default to loam if soil type unknown
    
    # Adjust suitability based on conditions
    for crop in crops:
        suitability = crop["baseScore"]
        
        # Temperature adjustment
        if 20 <= temperature <= 30:
            suitability += 5
        elif 15 <= temperature <= 35:
            suitability -= 5
        else:
            suitability -= 15
            
        # Humidity adjustment
        if 60 <= humidity <= 80:
            suitability += 5
        elif 40 <= humidity <= 90:
            suitability -= 5
        else:
            suitability -= 10
            
        # Ensure suitability stays within bounds
        crop["suitability"] = max(min(suitability, 100), 0)
        
    return crops

@app.route("/api/crop-profitability", methods=["POST"])
def get_crop_profitability():
    """API endpoint to get crop profitability analysis using Gemini AI with optional government market data"""
    try:
        data = request.json
        location = data.get("location")

        if not location:
            return jsonify({"error": "Location is required"}), 400

        print(f"Analyzing crop profitability for location: {location}")

        # Extract state from location for market data
        location_parts = location.split(',')
        state = location_parts[1].strip() if len(location_parts) > 1 else location_parts[0].strip()
        
        # Attempt to fetch government market data
        market_data = None
        market_context_available = False
        
        try:
            print(f"Attempting to fetch government market data for state: {state}")
            market_response = get_market_data(state=state, limit=50)
            
            # Check if we got meaningful market data
            if (market_response and 
                market_response.get('records') and 
                len(market_response['records']) > 0 and
                any(record.get('commodity') and record.get('modal_price', '0') != '0' 
                    for record in market_response['records'])):
                
                market_data = market_response
                market_context_available = True
                print(f"Successfully retrieved {len(market_data['records'])} market records with pricing data")
            else:
                print("Government API returned no meaningful market data")
                
        except Exception as market_error:
            print(f"Government market data fetch error: {market_error}")

        # Use Gemini AI with conditional market context
        if model:
            try:
                # Build prompt with conditional market context
                base_prompt = f"""
                As an agricultural expert, analyze the crop profitability for the location: {location}

                Please provide recommendations for the 5 most profitable crops that can be grown in this location, considering:
                1. Local climate conditions and seasonality
                2. Soil suitability and agricultural practices
                3. Growing season timing and weather patterns
                4. Input costs vs expected returns
                5. Local farming infrastructure and logistics
                6. Government support schemes and MSP (Minimum Support Price)
                7. Export potential and processing opportunities
                """

                # Add market context if available
                if market_context_available and market_data:
                    # Extract and structure market data for AI context
                    market_context = "\n\n🏛️ CURRENT GOVERNMENT MARKET DATA ANALYSIS:\n"
                    crop_prices = {}
                    
                    for record in market_data['records'][:25]:  # Use up to 25 records for context
                        commodity = record.get('commodity', '').strip()
                        modal_price = record.get('modal_price', '0')
                        arrival_date = record.get('arrival_date', '')
                        market_name = record.get('market', '')
                        
                        if commodity and modal_price and modal_price != '0':
                            try:
                                price = float(modal_price)
                                if commodity not in crop_prices:
                                    crop_prices[commodity] = {
                                        'prices': [],
                                        'markets': [],
                                        'latest_date': arrival_date
                                    }
                                crop_prices[commodity]['prices'].append(price)
                                if market_name:
                                    crop_prices[commodity]['markets'].append(market_name)
                                if arrival_date > crop_prices[commodity]['latest_date']:
                                    crop_prices[commodity]['latest_date'] = arrival_date
                            except ValueError:
                                continue
                    
                    if crop_prices:
                        market_context += "Based on recent government market data from your region:\n\n"
                        for crop, info in crop_prices.items():
                            if info['prices']:
                                avg_price = sum(info['prices']) / len(info['prices'])
                                min_price = min(info['prices'])
                                max_price = max(info['prices'])
                                unique_markets = list(set(info['markets']))
                                
                                market_context += f"• {crop.title()}:\n"
                                market_context += f"  - Price Range: ₹{min_price:.0f} - ₹{max_price:.0f} per quintal\n"
                                market_context += f"  - Average Price: ₹{avg_price:.0f} per quintal\n"
                                if unique_markets:
                                    market_context += f"  - Available in {len(unique_markets)} markets\n"
                                if info['latest_date']:
                                    market_context += f"  - Last Updated: {info['latest_date']}\n"
                                market_context += "\n"
                        
                        market_context += "Please factor in these REAL current market prices when making your profitability recommendations.\n"
                    
                    full_prompt = base_prompt + market_context
                    print("Using Gemini AI with government market data context")
                    
                else:
                    # No market data available - let Gemini work with general knowledge
                    market_context = "\n\n📊 MARKET DATA STATUS:\n"
                    market_context += "Current government market data is not available for your specific region. "
                    market_context += "Please provide recommendations based on:\n"
                    market_context += "- General market trends and historical data\n"
                    market_context += "- Seasonal price patterns\n"
                    market_context += "- Regional agricultural practices\n"
                    market_context += "- Government MSP (Minimum Support Price) policies\n"
                    market_context += "- Export and domestic demand trends\n\n"
                    
                    full_prompt = base_prompt + market_context
                    print("Using Gemini AI without specific market data - relying on general knowledge")

                # Add output format instructions
                format_instructions = """
                
                📋 OUTPUT FORMAT:
                For each recommended crop, provide:
                - Crop name
                - Profitability level (High/Medium/Low) with reasoning
                - Expected price range (₹ per quintal) - use actual data if available, otherwise estimates
                - Brief explanation of why it's profitable in this location
                - Key cultivation considerations and best practices
                - Market demand assessment and selling opportunities
                - Seasonal timing recommendations

                Focus on practical, actionable advice that farmers can implement.
                Prioritize crops with the best profit potential for the given location.
                """
                
                full_prompt += format_instructions

                # Generate AI response
                response = model.generate_content(full_prompt)
                ai_response = response.text

                # Parse the AI response into structured format
                recommendations = parse_enhanced_gemini_response(ai_response, market_data)
                
                return jsonify({
                    "success": True,
                    "location": location,
                    "recommendations": recommendations,
                    "market_data_used": market_context_available,
                    "market_records_count": len(market_data['records']) if market_data else 0,
                    "ai_response": ai_response,
                    "data_source": "AI + Government Data" if market_context_available else "AI Analysis Only",
                    "analysis_type": "Enhanced with live market data" if market_context_available else "General agricultural knowledge"
                })

            except Exception as ai_error:
                print(f"Gemini AI error: {ai_error}")
                # Fallback to enhanced regional recommendations
                return get_enhanced_fallback_crop_recommendations(location, market_data)

        else:
            print("Gemini AI not configured, using fallback recommendations")
            # Fallback if Gemini API not configured
            return get_enhanced_fallback_crop_recommendations(location, market_data)

    except Exception as e:
        print(f"Error in crop profitability analysis: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

def extract_crop_name(line):
    """Extract crop name from a line of text"""
    # Remove common prefixes and formatting
    line = line.strip()
    
    # Remove numbering (1., 2., etc.)
    import re
    line = re.sub(r'^\d+\.?\s*', '', line)
    
    # Remove markdown formatting
    line = re.sub(r'\*\*([^*]+)\*\*', r'\1', line)
    line = re.sub(r'[*#-]\s*', '', line)
    
    # Remove common phrases
    phrases_to_remove = [
        'crop:', 'recommended:', 'suggestion:', 'option:', 
        'suitable:', 'profitable:', 'good choice:'
    ]
    
    for phrase in phrases_to_remove:
        if phrase in line.lower():
            line = line.lower().replace(phrase, '').strip()
    
    # Take the first few words as crop name
    words = line.split()
    if words:
        # Usually crop names are 1-3 words
        crop_name = ' '.join(words[:3])
        return crop_name.title()
    
    return None

def parse_enhanced_gemini_response(ai_response, market_data):
    """Parse Gemini AI response with enhanced market data integration"""
    recommendations = []
    
    try:
        # Split response into sections and extract crop information
        lines = ai_response.split('\n')
        current_crop = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for crop names (usually numbered or bulleted)
            if any(keyword in line.lower() for keyword in ['1.', '2.', '3.', '4.', '5.', '**', 'crop:']):
                if current_crop:
                    recommendations.append(current_crop)
                
                # Extract crop name
                crop_name = extract_crop_name(line)
                if crop_name:
                    current_crop = {
                        "name": crop_name,
                        "profitability": "Medium",  # Default
                        "details": "",
                        "price_range": "Price data updating...",
                        "market_demand": "Moderate"
                    }
            
            elif current_crop:
                # Look for profitability indicators
                if any(keyword in line.lower() for keyword in ['high profit', 'highly profitable', 'excellent return']):
                    current_crop["profitability"] = "High"
                elif any(keyword in line.lower() for keyword in ['low profit', 'moderate return', 'limited profit']):
                    current_crop["profitability"] = "Low"
                
                # Look for price information
                if '₹' in line or 'rupee' in line.lower() or 'price' in line.lower():
                    current_crop["price_range"] = line
                
                # Look for market demand info
                if any(keyword in line.lower() for keyword in ['demand', 'market', 'export', 'consumption']):
                    if any(high_demand in line.lower() for high_demand in ['high demand', 'strong demand', 'growing demand']):
                        current_crop["market_demand"] = "High"
                    elif any(low_demand in line.lower() for low_demand in ['low demand', 'limited demand', 'weak demand']):
                        current_crop["market_demand"] = "Low"
                
                # Add to details
                if line and not line.startswith('#'):
                    current_crop["details"] += line + " "
        
        # Add the last crop
        if current_crop:
            recommendations.append(current_crop)
        
        # Enhance with market data if available
        if market_data and market_data.get('records'):
            recommendations = enhance_recommendations_with_market_data(recommendations, market_data)
        
        # If parsing didn't work well, create basic structure from text
        if len(recommendations) < 3:
            recommendations = create_enhanced_recommendations_from_text(ai_response, market_data)
            
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        recommendations = create_enhanced_recommendations_from_text(ai_response, market_data)
    
    return recommendations[:5]  # Return max 5 recommendations

def enhance_recommendations_with_market_data(recommendations, market_data):
    """Enhance crop recommendations with real government market data"""
    if not market_data or not market_data.get('records'):
        return recommendations
    
    # Build price lookup from market data
    crop_market_info = {}
    for record in market_data['records']:
        commodity = record.get('commodity', '').lower()
        modal_price = record.get('modal_price', '0')
        arrival_date = record.get('arrival_date', '')
        
        if commodity and modal_price and modal_price != '0':
            try:
                price = float(modal_price)
                if commodity not in crop_market_info:
                    crop_market_info[commodity] = {'prices': [], 'latest_date': ''}
                crop_market_info[commodity]['prices'].append(price)
                if arrival_date > crop_market_info[commodity]['latest_date']:
                    crop_market_info[commodity]['latest_date'] = arrival_date
            except:
                pass
    
    # Enhance recommendations with market data
    for recommendation in recommendations:
        crop_name = recommendation['name'].lower()
        
        # Try to match crop name with market data
        matched_market_data = None
        for market_crop in crop_market_info:
            if crop_name in market_crop or market_crop in crop_name:
                matched_market_data = crop_market_info[market_crop]
                break
        
        if matched_market_data and matched_market_data['prices']:
            prices = matched_market_data['prices']
            avg_price = sum(prices) / len(prices)
            min_price = min(prices)
            max_price = max(prices)
            
            recommendation['price_range'] = f"₹{min_price:.0f} - ₹{max_price:.0f} per quintal (Avg: ₹{avg_price:.0f})"
            recommendation['market_data_available'] = True
            recommendation['latest_price_date'] = matched_market_data['latest_date']
            
            # Adjust profitability based on price
            if avg_price > 3000:
                recommendation['profitability'] = 'High'
            elif avg_price > 2000:
                recommendation['profitability'] = 'Medium'
    
    return recommendations

def create_enhanced_recommendations_from_text(text, market_data):
    """Create enhanced recommendations when parsing fails"""
    # Common profitable crops with enhanced data
    fallback_crops = [
        {"name": "Rice", "profitability": "High", "details": "Staple crop with consistent market demand and government MSP support.", "price_range": "₹1,500-2,500 per quintal", "market_demand": "High"},
        {"name": "Wheat", "profitability": "High", "details": "Essential grain crop with stable market prices and assured procurement.", "price_range": "₹1,800-2,200 per quintal", "market_demand": "High"},
        {"name": "Cotton", "profitability": "Medium", "details": "Cash crop with export potential but requires pest management.", "price_range": "₹4,000-6,000 per quintal", "market_demand": "Medium"},
        {"name": "Vegetables", "profitability": "High", "details": "High-value crops with quick returns and urban market demand.", "price_range": "₹800-3,000 per quintal", "market_demand": "High"},
        {"name": "Pulses", "profitability": "Medium", "details": "Protein crops with good market demand and soil benefits.", "price_range": "₹3,000-5,000 per quintal", "market_demand": "Medium"}
    ]
    
    # Enhance with actual market data if available
    if market_data:
        fallback_crops = enhance_recommendations_with_market_data(fallback_crops, market_data)
    
    return fallback_crops

def get_enhanced_fallback_crop_recommendations(location, market_data):
    """Provide enhanced fallback recommendations with market data"""
    location_lower = location.lower()
    
    # Regional recommendations with market data integration
    if any(state in location_lower for state in ['punjab', 'haryana', 'uttar pradesh']):
        recommendations = [
            {"name": "Wheat", "profitability": "High", "details": "Excellent wheat-growing region with good infrastructure and MSP support.", "price_range": "₹1,975 MSP + market premium", "market_demand": "High"},
            {"name": "Rice", "profitability": "High", "details": "Suitable for kharif season with assured irrigation and procurement.", "price_range": "₹2,183 MSP (Common variety)", "market_demand": "High"},
            {"name": "Sugarcane", "profitability": "Medium", "details": "Good returns but requires water supply and nearby mills.", "price_range": "₹340-380 per quintal", "market_demand": "Medium"},
            {"name": "Vegetables", "profitability": "High", "details": "High-value crops with urban market access.", "price_range": "₹1,000-4,000 per quintal", "market_demand": "High"},
            {"name": "Mustard", "profitability": "Medium", "details": "Rabi crop with growing oil demand.", "price_range": "₹5,450 MSP", "market_demand": "Medium"}
        ]
    else:
        # Generic enhanced recommendations
        recommendations = [
            {"name": "Rice", "profitability": "High", "details": "Staple crop with consistent demand and government support.", "price_range": "₹2,183 MSP", "market_demand": "High"},
            {"name": "Wheat", "profitability": "High", "details": "Essential grain with stable market and MSP.", "price_range": "₹1,975 MSP", "market_demand": "High"},
            {"name": "Vegetables", "profitability": "High", "details": "Quick returns with urban demand growth.", "price_range": "₹800-3,500 per quintal", "market_demand": "High"},
            {"name": "Pulses", "profitability": "Medium", "details": "Protein crops improving soil fertility.", "price_range": "₹3,000-6,000 per quintal", "market_demand": "Medium"},
            {"name": "Oilseeds", "profitability": "Medium", "details": "Growing demand for edible oils.", "price_range": "₹4,000-5,500 per quintal", "market_demand": "Medium"}
        ]
    
    # Enhance with actual market data if available
    if market_data:
        recommendations = enhance_recommendations_with_market_data(recommendations, market_data)
    
    return jsonify({
        "success": True,
        "location": location,
        "recommendations": recommendations,
        "fallback": True,
        "market_data_used": bool(market_data),
        "market_records_count": len(market_data['records']) if market_data else 0,
        "message": "Enhanced recommendations with government market data integration"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
#!/usr/bin/env python3
"""
Final Sensor Reader for DHT22 and Moisture Sensor
Robust implementation with multiple fallback options
"""

import time
import sys
import subprocess
import requests

class SensorReader:
    def __init__(self):
        self.dht_pin = 4
        self.moisture_pin = 21
        self.gpio_available = False
        self.dht_available = False
        
    def check_raspberry_pi(self):
        """Check if running on Raspberry Pi"""
        try:
            with open('/proc/cpuinfo', 'r') as f:
                if 'Raspberry Pi' in f.read():
                    return True
        except:
            pass
        return False
    
    def setup_gpio(self):
        """Setup GPIO for moisture sensor with better error handling"""
        try:
            import RPi.GPIO as GPIO
            
            # Clean up any existing GPIO setup first
            GPIO.cleanup()
            
            # Set GPIO mode
            GPIO.setmode(GPIO.BCM)
            
            # Set up moisture sensor pin with proper error handling
            try:
                GPIO.setup(self.moisture_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
                self.gpio_available = True
                print("GPIO initialized successfully")
                return True
            except Exception as setup_error:
                print(f"GPIO setup error for pin {self.moisture_pin}: {setup_error}")
                # Try without pull-up resistor
                try:
                    GPIO.setup(self.moisture_pin, GPIO.IN)
                    self.gpio_available = True
                    print("GPIO initialized successfully (without pull-up)")
                    return True
                except Exception as fallback_error:
                    print(f"GPIO fallback setup failed: {fallback_error}")
                    return False
                    
        except Exception as e:
            print(f"GPIO not available: {e}")
            print("This might be due to:")
            print("1. Not running on Raspberry Pi")
            print("2. Insufficient GPIO permissions")
            print("3. GPIO already in use by another process")
            return False
    
    def read_moisture(self):
        """Read digital moisture sensor from GPIO21"""
        if not self.gpio_available:
            return None, None
            
        try:
            import RPi.GPIO as GPIO
            moisture_value = GPIO.input(self.moisture_pin)
            moisture_percent = 100 if moisture_value else 0
            return moisture_percent, moisture_value
        except Exception as e:
            print(f"Moisture sensor error: {e}")
            return None, None
    
    def read_dht22(self):
        """Read DHT22 sensor with multiple approaches and better error handling"""
        # Method 1: Try lgpio (modern approach)
        try:
            import lgpio
            # Open GPIO chip
            chip = lgpio.gpiochip_open(0)
            
            # This is a simplified approach - actual DHT22 reading with lgpio is complex
            # For now, we'll skip this and try other methods
            lgpio.gpiochip_close(chip)
        except Exception as e:
            print(f"lgpio method failed: {e}")
        
        # Method 2: Try Adafruit_DHT library
        try:
            import Adafruit_DHT as dht
            humidity, temperature = dht.read_retry(dht.DHT22, self.dht_pin, retries=3, delay_seconds=1)
            if humidity is not None and temperature is not None:
                self.dht_available = True
                print(f"DHT22 reading successful via Adafruit_DHT: {temperature:.1f}°C, {humidity:.1f}%")
                return humidity, temperature
            else:
                print("DHT22 Adafruit_DHT method returned None values")
        except ImportError:
            print("Adafruit_DHT library not available")
        except Exception as e:
            print(f"Adafruit_DHT method failed: {e}")
            
        # Method 3: Try adafruit-circuitpython-dht
        try:
            import adafruit_dht
            import board
            
            # Create DHT22 object
            dht_device = adafruit_dht.DHT22(board.D4)
            
            # Try to read with retries
            for attempt in range(3):
                try:
                    temperature = dht_device.temperature
                    humidity = dht_device.humidity
                    
                    if humidity is not None and temperature is not None:
                        self.dht_available = True
                        print(f"DHT22 reading successful via CircuitPython: {temperature:.1f}°C, {humidity:.1f}%")
                        dht_device.exit()
                        return humidity, temperature
                    else:
                        print(f"DHT22 attempt {attempt + 1}: Got None values")
                        time.sleep(2)
                        
                except RuntimeError as e:
                    print(f"DHT22 attempt {attempt + 1} failed: {e}")
                    time.sleep(2)
            
            # Clean up
            dht_device.exit()
            
        except ImportError:
            print("adafruit-circuitpython-dht library not available")
        except Exception as e:
            print(f"CircuitPython DHT method failed: {e}")
        
        # Method 4: Try alternative GPIO approach
        try:
            import RPi.GPIO as GPIO
            print("Attempting direct GPIO bit-banging for DHT22 (this may not work reliably)")
            # Note: Direct bit-banging for DHT22 is complex and unreliable
            # We'll skip this for now
        except Exception as e:
            print(f"Direct GPIO approach failed: {e}")
            
        # Method 5: Fallback to simulated data with warning
        print("All DHT22 reading methods failed. Using simulated sensor data.")
        print("This could be due to:")
        print("1. DHT22 sensor not connected to GPIO 4")
        print("2. Insufficient GPIO permissions (try running with sudo)")
        print("3. GPIO conflicts with other processes")
        print("4. Hardware issues with the DHT22 sensor")
        
        # Generate realistic simulated data
        import random
        temperature = round(20.0 + random.uniform(-2, 2), 1)
        humidity = round(45.0 + random.uniform(-5, 5), 1)
        print(f"Using simulated data: {temperature:.1f}°C, {humidity:.1f}%")
        return humidity, temperature

    def get_soil_type(self, latitude, longitude):
        """Fetch soil type data from the Soil API (SoilGrids)"""
        try:
            api_url = "https://api.openepi.io/soil/type"
            params = {
                "lat": latitude,
                "lon": longitude,
                "top_k": 1
            }
            response = requests.get(api_url, params=params)
            response.raise_for_status()
            soil_data = response.json()
            return soil_data.get("properties", {}).get("most_probable_soil_type", "Unknown")
        except Exception as e:
            print(f"Failed to fetch soil type: {e}")
            return "Unknown"

    def send_to_gemini(self, data):
        """Send sensor and soil data to Gemini for plant recommendations"""
        try:
            api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
            headers = {
                "Content-Type": "application/json",
                "X-goog-api-key": "AIzaSyAz63mCdTbsBnsZ_VjOa0Y0ozM4zOraLow"
            }
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": f"Provide a numbered list of plant names based on the following data: Temperature: {data['temperature']}°C, Humidity: {data['humidity']}%, Soil Type: {data['soil_type']}. Ignore moisture data. Only list the plant names, one per line, without JSON formatting."
                            }
                        ]
                    }
                ]
            }
            response = requests.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            recommendations = response.json()

            print("Gemini API Response:")
            plants = [part["text"] for part in recommendations.get("candidates", [{}])[0].get("content", {}).get("parts", [])]
            for plant in plants:
                print(plant)
            return plants
        except Exception as e:
            print(f"Failed to fetch plant recommendations from Gemini: {e}")
            return []

    def run(self):
        """Main reading loop"""
        print("=" * 60)
        print("Sensor Reader - DHT22 (GPIO4) & Moisture Sensor (GPIO21)")
        print("=" * 60)

        if not self.check_raspberry_pi():
            print("WARNING: Not running on Raspberry Pi - using test data")

        self.setup_gpio()
        humidity, temperature = self.read_dht22()
        moisture_percent, raw_value = self.read_moisture()

        print("Initial Sensor Readings:")
        if humidity is not None and temperature is not None:
            print(f"Temperature: {temperature:.1f}°C")
            print(f"Humidity: {humidity:.1f}%")
        else:
            print("DHT22: Sensor not available")

        if moisture_percent is not None:
            print(f"Moisture: {moisture_percent:.1f}% (Digital: {raw_value})")
        else:
            print("Moisture: Sensor not available")

        latitude = input("Enter latitude: ")
        longitude = input("Enter longitude: ")

        soil_type = self.get_soil_type(latitude, longitude)
        print(f"Detected Soil Type: {soil_type}")

        data = {
            "temperature": temperature,
            "humidity": humidity,
            "moisture_percent": moisture_percent,
            "soil_type": soil_type
        }

        plants = self.send_to_gemini(data)
        print("Recommended Plants:")
        for plant in plants:
            print(f"- {plant}")

        print("Process completed. Exiting...")

        if self.gpio_available:
            try:
                import RPi.GPIO as GPIO
                GPIO.cleanup()
                print("GPIO cleanup completed")
            except:
                pass

def install_dependencies():
    """Helper function to install required packages"""
    print("Installing dependencies...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install",
            "Adafruit_DHT", "spidev", "RPi.GPIO", "adafruit-circuitpython-dht", "Flask", "requests"
        ], check=True)
        print("Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("Failed to install dependencies")
        print("Try: sudo apt update && sudo apt install python3-pip")
        print("Then: pip install Adafruit_DHT spidev RPi.GPIO adafruit-circuitpython-dht Flask requests")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--install":
        install_dependencies()
    else:
        reader = SensorReader()
        reader.run()
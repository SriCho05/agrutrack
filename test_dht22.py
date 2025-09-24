#!/usr/bin/env python3
"""
Simple DHT22 Test Script
Tests basic DHT22 functionality on GPIO4
"""

import time
import sys

def test_dht22():
    """Test DHT22 sensor reading"""
    try:
        # Try to import and use Adafruit_DHT
        import Adafruit_DHT as dht
        
        print("Testing DHT22 sensor on GPIO4...")
        print("Press Ctrl+C to stop")
        print("-" * 40)
        
        while True:
            humidity, temperature = dht.read_retry(dht.DHT22, 4)
            
            if humidity is not None and temperature is not None:
                print(f"Temperature: {temperature:.1f}°C")
                print(f"Humidity: {humidity:.1f}%")
                print("-" * 20)
            else:
                print("Failed to read sensor data")
            
            time.sleep(2)
            
    except ImportError:
        print("Adafruit_DHT library not installed")
        print("Install with: pip install Adafruit_DHT")
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure:")
        print("1. DHT22 is properly wired (VCC, DATA, GND)")
        print("2. 10K resistor between VCC and DATA")
        print("3. Running on Raspberry Pi")

if __name__ == "__main__":
    test_dht22()

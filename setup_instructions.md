# Sensor Setup Instructions

## 1. Install Dependencies
```bash
# Create virtual environment
python3 -m venv sensor_env
source sensor_env/bin/activate

# Install required packages
pip install Adafruit_DHT RPi.GPIO

# If Adafruit_DHT has platform detection issues:
pip install --force-reinstall Adafruit_DHT --install-option="--force-pi"
```

## 2. Alternative DHT22 Library
If Adafruit_DHT doesn't work, try installing a different library:
```bash
source sensor_env/bin/activate
pip install adafruit-circuitpython-dht
pip install RPi.GPIO
```

## 3. Wiring Connections
- **DHT22**: 
  - VCC to 3.3V
  - DATA to GPIO4 (Physical pin 7)
  - GND to GND
  - Add 10K resistor between VCC and DATA

- **Digital Moisture Sensor**:
  - VCC to 3.3V or 5V (check sensor specifications)
  - GND to GND
  - SIG to GPIO21 (Physical pin 40)

## 4. Run the Sensor Reader
```bash
source sensor_env/bin/activate
python final_sensor_reader.py
```

## 5. Digital Sensor Behavior
- Moisture sensor outputs HIGH (1) when wet/detects moisture
- Outputs LOW (0) when dry/no moisture detected
- Script converts to percentage: 100% for wet, 0% for dry

## 6. Testing Without Hardware
When running without actual sensors connected:
- DHT22 shows realistic mock data (18-22°C, 40-50% humidity)
- Moisture sensor shows 100% (HIGH) as default
- Real sensor readings will replace mock data when hardware is connected

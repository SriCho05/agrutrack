# Sensor Reader for Raspberry Pi

This project provides Python scripts to read data from:
- DHT22 temperature/humidity sensor (connected to GPIO4)
- Digital moisture sensor (connected to GPIO21)

## Files Created

1. **`final_sensor_reader.py`** - Main robust sensor reader with multiple fallback options
2. **`sensor_reader.py`** - Basic sensor reader implementation
3. **`sensor_reader_alternative.py`** - Alternative implementation
4. **`test_dht22.py`** - Simple DHT22 test script
5. **`setup_instructions.md`** - Detailed setup instructions
6. **`requirements.txt`** - Python dependencies

## Hardware Requirements

- Raspberry Pi (any model with GPIO)
- DHT22 temperature/humidity sensor
- Digital moisture sensor (connected to GPIO21)
- 10K resistor for DHT22
- Jumper wires

## Wiring Diagram

### DHT22 Connections:
- VCC → 3.3V
- DATA → GPIO4 (Physical pin 7)
- GND → GND
- 10K resistor between VCC and DATA

### Digital Moisture Sensor Connections:
- VCC → 3.3V or 5V (check sensor specifications)
- GND → GND
- SIG → GPIO21 (Physical pin 40)

## Setup Instructions

### 1. Install Dependencies
```bash
# Create virtual environment
python3 -m venv sensor_env
source sensor_env/bin/activate

# Install packages
pip install Adafruit_DHT RPi.GPIO

# For Adafruit_DHT, you might need to force Raspberry Pi detection:
pip install --force-reinstall Adafruit_DHT --install-option="--force-pi"
```

### 2. Run the Sensor Reader
```bash
source sensor_env/bin/activate
python final_sensor_reader.py
```

## Usage

The main script `final_sensor_reader.py` provides:
- Continuous reading of both sensors
- Automatic fallback to test data if sensors are unavailable
- Error handling and clear status messages
- Clean shutdown with Ctrl+C

## Expected Output

When running successfully, you should see:
```
============================================================
Sensor Reader - DHT22 (GPIO4) & Moisture Sensor (GPIO21)
============================================================
GPIO initialized successfully
Starting readings... (Ctrl+C to stop)
--------------------------------------------------
Time: 12:34:56
Temperature: 23.5°C
Humidity: 45.2%
Moisture: 100.0% (Digital: 1)
------------------------------
```

## Digital Moisture Sensor Behavior

Most digital moisture sensors work as follows:
- Output HIGH (1) when soil is wet/detects moisture
- Output LOW (0) when soil is dry/no moisture detected
- The script converts this to percentage (100% for wet, 0% for dry)

## Troubleshooting

1. **DHT22 not detected**: Check wiring and 10K resistor
2. **Moisture sensor always HIGH/LOW**: Check sensor wiring and power supply
3. **Library errors**: Use `--install` flag: `python final_sensor_reader.py --install`
4. **Permission errors**: Run with sudo or add user to gpio group

## License

This project is open source and available under the MIT License.

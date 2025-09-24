# Web Application Project

This project is a web application that integrates environmental sensor readings with a user-friendly interface. It utilizes a Flask backend to handle API requests and a frontend that incorporates Google Maps for user input of geographical coordinates.

## Project Structure

```
web-app-project
├── backend
│   ├── app.py                # Main backend application with Flask server
│   ├── requirements.txt      # Python dependencies for the backend
│   └── final_sensor_reader.py # Sensor reading logic
├── frontend
│   ├── index.html            # HTML structure for the web application
│   ├── styles.css            # CSS styles for the frontend
│   └── script.js             # JavaScript for user interactions and API calls
├── README.md                 # Project documentation
└── .gitignore                # Files and directories to ignore by Git
```

## Setup Instructions

### Backend

1. Navigate to the `backend` directory:
   ```
   cd backend
   ```

2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

3. Run the Flask application:
   ```
   python app.py
   ```

### Frontend

1. Open `frontend/index.html` in a web browser to access the application.

## Usage

- The application allows users to drop a pin on Google Maps to select latitude and longitude.
- Once the coordinates are selected, the application fetches environmental data from the sensors and displays it on the frontend.

## Dependencies

- Flask
- Requests
- Adafruit_DHT
- RPi.GPIO
- adafruit-circuitpython-dht

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.
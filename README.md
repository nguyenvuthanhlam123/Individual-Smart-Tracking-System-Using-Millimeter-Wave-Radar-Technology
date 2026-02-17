# Individual Smart Tracking System Using Millimeter Wave Radar Technology

This is an IoT project improved by a 3rd year student major in Telecommunication engineering, which is used for indoor tracking by using FMCW radar 24GHz HLK-LD2410 and ESP32 microcontroller. The connection between devices is based on WiFi and MQTT to display the result on a website dashboard. Subsequently, the coordinates is filtered by Kalman algorithm to predict the moving state of target.

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Components](#components)
  - [Embedded Firmware](#embedded-firmware)
  - [Node.js System](#nodejs-system)
  - [IoT Monitor Application](#iot-monitor-application)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
- [MQTT Topics](#mqtt-topics)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## 🎯 Overview

This project implements a real-time indoor positioning system using distance measurements from multiple sensors. The system employs trilateration algorithms to calculate 3D coordinates (x, y, z) and includes comprehensive data processing, logging, and visualization capabilities.

**Key Technologies:**

- **Embedded**: Arduino (C++) for ESP32/ESP8266 microcontrollers
- **Backend**: Node.js, Express.js, Aedes (MQTT broker)
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: HTML5, JavaScript, Bootstrap, Chart.js
- **Protocols**: MQTT for IoT communication
- **Containerization**: Docker & Docker Compose

## 🏗️ System Architecture

```
┌─────────────────┐
│  Distance       │
│  Sensors (1-3)  │ ──MQTT──┐
└─────────────────┘         │
                            ▼
                    ┌───────────────┐
                    │ Central Node  │
                    │ (Trilateration│
                    │  Calculation) │
                    └───────┬───────┘
                            │ MQTT
                            ▼
                    ┌───────────────┐
                    │ Device        │
                    │ Gateway       │
                    └───────┬───────┘
                            │ MQTT
                            ▼
┌──────────────────────────────────────────┐
│         IoT Monitor Backend              │
│  (MQTT Handler, REST API, MongoDB)      │
└────────────┬─────────────────────────────┘
             │ REST API
             ▼
┌──────────────────────────────────────────┐
│         Web Dashboard Frontend           │
│  (Real-time Visualization & Monitoring) │
└──────────────────────────────────────────┘
```

## ✨ Features

### Core Functionality

- **Real-time 3D Positioning**: Trilateration algorithm using three distance sensors
- **Distance Offset Correction**: Configurable offset for sensor calibration
- **Periodic Averaging**: Smooths coordinate calculations over time intervals
- **Error Calculation**: Computes positioning accuracy metrics
- **Data Logging**: CSV file logging for analysis and debugging

### Embedded Features

- **Multiple Firmware Variants**:
  - ESP32 WiFi Client mode
  - ESP32 Hybrid (Local Broker + External Client)
  - ESP8266 AP+STA mode (Access Point + Station)
- **Modular Architecture**: Separated configuration, networking, calculation, and logging modules
- **Configurable Logging Levels**: Verbose, Info, Warning, Error
- **OTA Updates Support**: (ESP32 versions)

### Backend Features

- **MQTT Message Handling**: Real-time data ingestion from IoT devices
- **RESTful API**: Comprehensive endpoints for data access and management
- **User Authentication**: Session-based authentication with bcrypt
- **Database Persistence**: MongoDB for telemetry data storage
- **Topic Statistics**: Real-time monitoring of MQTT traffic

### Frontend Features

- **Real-time Dashboard**: Live telemetry data visualization
- **Interactive Charts**: Message size trends with Chart.js
- **User Management**: Secure login/logout functionality
- **Responsive Design**: Mobile-friendly Bootstrap interface
- **Topic Status Monitoring**: Track active MQTT topics and message rates

### Simulation & Testing

- **Interactive Device Simulator**: Command-line tool to simulate multiple IoT devices
- **Configurable Parameters**: Adjustable message intervals, error rates, and device counts
- **Real-time Statistics**: Monitor published messages and active devices

## 📁 Project Structure

```
project/
├── README.md
├── Device/                           # ESP32 Distance Sensor Firmware
│   └── Device.ino                    # LD2410 radar sensor integration
│
├── ESP32_CentralNode/                # ESP32 Central Node (WiFi Client)
│   ├── ESP32_CentralNode.ino
│   ├── config.h/cpp                  # Configuration management
│   ├── types.h                       # Data structures
│   ├── network_manager.h/cpp         # WiFi & MQTT client
│   ├── calculation_logic.h/cpp       # Trilateration algorithms
│   └── logging.h/cpp                 # Serial logging utilities
│
├── ESP32_CentralNode_Hybrid/         # ESP32 Hybrid (Broker + Client)
│   ├── ESP32_CentralNode_Hybrid.ino
│   └── [similar modular structure]
│
├── ESP8266_CentralNode_Hybrid_AP/    # ESP8266 AP+STA Mode
│   ├── ESP8266_CentralNode_Hybrid_AP.ino
│   └── [similar modular structure]
│
├── system/                           # Node.js System Components
│   ├── central_node/                 # Central calculation node
│   │   ├── central_node.js           # Main logic
│   │   ├── config.json               # Configuration
│   │   └── data/                     # CSV output logs
│   ├── devices/                      # Simulated sensor devices
│   │   ├── device1.js
│   │   ├── device2.js
│   │   └── device3.js
│   ├── dashboard/                    # Legacy web dashboard
│   │   ├── web_gateway.js            # WebSocket gateway
│   │   └── public/                   # Frontend files
│   ├── server0/                      # MQTT device gateway server
│   │   ├── module_server.js
│   │   └── data/                     # Simulation data
│   ├── start.sh                      # System startup script
│   └── stop_all.sh                   # System shutdown script
│
├── iot-monitor/                      # Docker-based Monitor Application
│   ├── docker-compose.yml            # Multi-container orchestration
│   ├── backend/                      # Node.js Backend
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── server.js             # Express server
│   │   │   ├── services/
│   │   │   │   └── mqttHandler.js    # MQTT client
│   │   │   ├── models/
│   │   │   │   ├── TelemetryData.js  # Data schema
│   │   │   │   └── User.js           # User schema
│   │   │   ├── routes/
│   │   │   │   ├── api.js            # API routes
│   │   │   │   └── auth.js           # Auth routes
│   │   │   └── middleware/
│   │   │       └── authMiddleware.js # Auth validation
│   │   └── config/
│   │       └── mqttConfig.js         # MQTT settings
│   ├── frontend/                     # Static Web Frontend
│   │   ├── Dockerfile
│   │   ├── nginx.conf                # Nginx configuration
│   │   └── public/
│   │       ├── index.html            # Main dashboard
│   │       ├── login.html            # Login page
│   │       ├── script.js             # Dashboard logic
│   │       └── style.css             # Styling
│   ├── simulator/                    # Device Simulator
│   │   ├── Dockerfile
│   │   └── simulator.js              # Interactive CLI simulator
│   └── mosquitto/                    # MQTT Broker
│       └── config/
│           └── mosquitto.conf
│
└── dashboard-client/                 # Standalone Dashboard Client
    └── [legacy dashboard files]
```

## 🔧 Components

### Embedded Firmware

#### ESP32/ESP8266 Central Node

Calculates 3D position using trilateration from three distance sensors.

**Features:**

- Receives distance data (d1, d2, d3) from sensors via MQTT
- Applies configurable offset correction
- Calculates instantaneous (x, y, z) coordinates
- Computes periodic averages
- Publishes results to MQTT topics
- Logs data to CSV files

**Configuration (`config.h`):**

```cpp
// Anchor coordinates (S1=origin, S2=(a,0,0), S3=(c,b,0))
#define S2_a 210.0
#define S3_c 0.0
#define S3_b 130.0

// Calculation settings
#define DISTANCE_OFFSET 35.0
#define HISTORY_SIZE 5
#define AVERAGE_INTERVAL_MS 3000

// Networking
#define WIFI_SSID "YourSSID"
#define WIFI_PASSWORD "YourPassword"
#define MQTT_BROKER_IP "192.168.1.100"
#define MQTT_BROKER_PORT 1886

// Logging
#define LOG_LEVEL 3  // 0=Error, 1=Warn, 2=Info, 3=Verbose
```

#### Distance Sensor Device (Device.ino)

Reads distance measurements from LD2410 radar sensor and publishes to MQTT.

**Hardware:**

- ESP32 microcontroller
- LD2410 radar sensor
- UART communication (GPIO 16/17)

### Node.js System

#### Central Node (`system/central_node/`)

Node.js implementation of the central calculation node with Aedes MQTT broker.

**Features:**

- Embedded MQTT broker (Aedes)
- Trilateration calculation
- Distance offset correction
- Periodic averaging (configurable interval)
- Error calculation (r value)
- CSV data logging
- Configurable via `config.json`

**Configuration (`config.json`):**

```json
{
  "anchorCoordinates": {
    "S2_a": 210,
    "S3_c": 0,
    "S3_b": 130
  },
  "calculationSettings": {
    "historySize": 5,
    "distanceOffset": 35,
    "averageCalculationIntervalMs": 3000,
    "publishResults": true
  },
  "logging": {
    "level": "verbose"
  },
  "mqttConfig": {
    "centralNodePort": 1886,
    "deviceGatewayUrl": "mqtt://192.168.1.107:1885",
    "sensorTopic": "/node/central",
    "outputTopic": "/central/d_gateway",
    "outputDeviceId": 1
  }
}
```

#### Device Gateway Server (`system/server0/`)

MQTT gateway that routes data between devices and the monitoring backend.

#### Simulated Devices (`system/devices/`)

Node.js scripts that simulate sensor devices for testing without hardware.

### IoT Monitor Application

#### Backend (`iot-monitor/backend/`)

Express.js server with MQTT integration and MongoDB persistence.

**Key Features:**

- MQTT message handling and data ingestion
- RESTful API for telemetry data access
- User authentication with sessions (bcrypt + express-session)
- MongoDB storage with Mongoose
- Topic statistics and monitoring

**Environment Variables:**

```env
PORT=3000
MONGO_URI=mongodb://mongo:27017/iot_monitor_db
MQTT_BROKER_URL=mqtt://mqtt-broker:1883
SESSION_SECRET=your_secret_key_here
NODE_ENV=production
```

#### Frontend (`iot-monitor/frontend/`)

Static web application served by Nginx.

**Features:**

- Real-time telemetry data table
- Message size charts (Chart.js)
- Topic status monitoring
- User authentication UI
- Responsive Bootstrap layout

#### Simulator (`iot-monitor/simulator/`)

Interactive CLI tool for simulating multiple IoT devices.

**Commands:**

```
start [topic]       - Start a new device on specified topic
stop <id>           - Stop a specific device
stop-all            - Stop all devices
list                - List active devices
pause <topic>       - Pause publishing for a topic
resume <topic>      - Resume publishing for a topic
stats               - Show current statistics
help                - Display help
```

#### MQTT Broker (`iot-monitor/mosquitto/`)

Eclipse Mosquitto broker for message routing.

## 🚀 Getting Started

### Prerequisites

**For Embedded Development:**

- Arduino IDE 1.8+ or PlatformIO
- ESP32/ESP8266 board support
- Libraries:
  - `PubSubClient`
  - `ArduinoJson`
  - `ld2410` (for sensor devices)

**For Node.js System:**

- Node.js 14+ and npm
- MQTT broker (Mosquitto recommended)

**For IoT Monitor Application:**

- Docker 20.10+
- Docker Compose 2.0+

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/TristanNguyen04/project.git
cd project
```

#### 2. Embedded Firmware Setup

**For ESP32 Central Node:**

```bash
cd ESP32_CentralNode
# Open ESP32_CentralNode.ino in Arduino IDE
# Configure config.h with your settings
# Upload to ESP32 board
```

**For Distance Sensor Device:**

```bash
cd Device
# Open Device.ino in Arduino IDE
# Configure WiFi and MQTT settings
# Upload to ESP32 board with LD2410 sensor
```

#### 3. Node.js System Setup

```bash
# Install dependencies for central node
cd system/central_node
npm install

# Install dependencies for device gateway
cd ../server0
npm install

# Install dependencies for devices (optional for simulation)
cd ../devices
npm install

# Install dependencies for dashboard (optional)
cd ../dashboard
npm install
```

#### 4. IoT Monitor Application Setup

```bash
cd iot-monitor

# Build and start all services
docker-compose up -d

# To include the simulator and internal MQTT broker
docker-compose --profile simulate up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Configuration

#### Central Node Configuration

Edit `system/central_node/config.json`:

```json
{
  "anchorCoordinates": {
    "S2_a": 210, // X coordinate of anchor S2
    "S3_c": 0, // X coordinate of anchor S3
    "S3_b": 130 // Y coordinate of anchor S3
  },
  "calculationSettings": {
    "historySize": 5, // Number of points for averaging
    "distanceOffset": 35, // Distance offset correction (cm)
    "averageCalculationIntervalMs": 3000, // Averaging period (ms)
    "publishResults": true // Enable/disable MQTT publishing
  },
  "logging": {
    "level": "verbose" // verbose | info | warning | error
  },
  "mqttConfig": {
    "centralNodePort": 1886,
    "deviceGatewayUrl": "mqtt://192.168.1.107:1885",
    "sensorTopic": "/node/central",
    "outputTopic": "/central/d_gateway",
    "outputDeviceId": 1
  }
}
```

#### IoT Monitor Configuration

Edit `iot-monitor/docker-compose.yml` environment variables or create a `.env` file:

```env
# MQTT Broker
MQTT_BROKER_URL=mqtt://your-broker:1883

# Backend
SESSION_SECRET=change_this_to_a_strong_random_secret

# MongoDB
MONGO_URI=mongodb://mongodb:27017/iot_monitor_db
```

## 📖 Usage

### Starting the Node.js System

```bash
cd system

# Start all components
./start.sh

# Or start individually:
# Terminal 1 - Central Node
cd central_node && node central_node.js

# Terminal 2 - Device Gateway
cd server0 && node module_server.js

# Terminal 3 - Simulated Devices (optional)
cd devices && node device1.js

# Terminal 4 - Dashboard Gateway (optional)
cd dashboard && node web_gateway.js
```

### Starting the IoT Monitor

```bash
cd iot-monitor

# Production mode (external MQTT broker)
docker-compose up -d

# Simulation mode (with internal broker and simulator)
docker-compose --profile simulate up -d

# Access the application:
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000
# MongoDB: localhost:27017
# MQTT Broker: localhost:1883 (simulation mode)
```

**Default Login:**

- Username: `admin`
- Password: `admin123`

### Using the Simulator

```bash
# Start simulator (in simulation mode)
docker exec -it iot-monitor-simulator sh

# Inside container, the simulator is already running
# Use available commands:
start /device/d_gateway    # Start device on topic
list                        # View active devices
stats                       # Show statistics
help                        # Show all commands
```

### Viewing Logs

```bash
# Central Node logs
tail -f system/central_node/data/1.csv

# Docker logs
docker-compose -f iot-monitor/docker-compose.yml logs -f backend
docker-compose -f iot-monitor/docker-compose.yml logs -f simulator

# Embedded device logs
# Connect via Arduino IDE Serial Monitor (115200 baud)
```

## 📡 MQTT Topics

### Central Node Topics

- **Input**: `/node/central` - Receives distance data from sensors

  ```json
  { "id": 1, "d": 120 }
  ```

- **Output**: `/central/d_gateway` - Publishes calculated coordinates
  ```json
  { "deviceID": 1, "data": { "x": 105.5, "y": 65.3, "z": 45.2, "r": 12.5 } }
  ```

### Device Gateway Topics

- **Device → Gateway**: `/device/d_gateway`

  ```json
  { "id": 2, "d": 150 }
  ```

- **Gateway → Server**: `/d_gateway/server`
  ```json
  { "deviceID": 1, "data": { "x": 105.5, "y": 65.3, "z": 45.2, "r": 12.5 } }
  ```

### Dashboard Topics

- **Server → Dashboard**: `/server/w_gateway`
  ```json
  {
    "deviceID": 1,
    "data": { "x": 105.5, "y": 65.3, "z": 45.2, "r": 12.5 },
    "timestamp": "2025-11-29T12:00:00Z"
  }
  ```

## 🔌 API Endpoints

### Authentication Endpoints

#### `POST /api/auth/login`

Login with username and password.

**Request:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**

```json
{
  "message": "Login successful.",
  "user": {
    "id": "...",
    "username": "admin"
  }
}
```

#### `POST /api/auth/logout`

Logout current user.

#### `GET /api/auth/status`

Check authentication status.

**Response:**

```json
{
  "isAuthenticated": true,
  "user": {
    "id": "...",
    "username": "admin"
  }
}
```

### Telemetry Data Endpoints

#### `GET /api/telemetry`

Get all telemetry data (requires authentication).

**Query Parameters:**

- `limit` (optional): Number of records to return (default: 100)
- `skip` (optional): Number of records to skip (default: 0)

**Response:**

```json
{
  "data": [
    {
      "deviceID": "1",
      "topic": "/d_gateway/server",
      "data": { "x": 105.5, "y": 65.3, "z": 45.2, "r": 12.5 },
      "timestamp": "2025-11-29T12:00:00.000Z"
    }
  ],
  "total": 1234
}
```

#### `GET /api/telemetry/:id`

Get specific telemetry record by ID.

#### `DELETE /api/telemetry/:id`

Delete specific telemetry record (requires authentication).

### Statistics Endpoints

#### `GET /api/stats/topics`

Get MQTT topic statistics.

**Response:**

```json
{
  "/d_gateway/server": {
    "messageCount": 1234,
    "lastMessageTimestamp": "2025-11-29T12:00:00.000Z",
    "lastMessageSize": 128
  }
}
```

#### `GET /api/stats/summary`

Get overall system statistics.

## 🛠️ Development

### Project Scripts

**Node.js System:**

```bash
# Central Node
cd system/central_node
npm start              # Start central node

# Device Gateway
cd system/server0
npm start              # Start gateway server

# Dashboard
cd system/dashboard
npm start              # Start web gateway
```

**IoT Monitor:**

```bash
cd iot-monitor

# Development mode
docker-compose up --build

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# View service logs
docker-compose logs -f backend

# Clean up
docker-compose down -v  # Remove volumes too
```

### Adding New Sensor Devices

1. **Hardware Setup**: Connect sensor to ESP32/ESP8266
2. **Firmware**: Modify `Device/Device.ino` for your sensor
3. **Configuration**: Set unique device ID and MQTT broker address
4. **Upload**: Flash firmware to microcontroller
5. **Testing**: Monitor serial output and MQTT messages

### Modifying Trilateration Algorithm

Edit `calculation_logic.cpp` (embedded) or `central_node.js` (Node.js):

```cpp
// Example: Add Z-axis calculation enhancement
float calculate_z_enhanced(float d1, float d2, float d3, float x, float y) {
    // Your custom Z calculation
    return z_value;
}
```

## 🐛 Troubleshooting

### Common Issues

**1. ESP32 won't connect to WiFi**

- Verify SSID and password in `config.h`
- Check WiFi signal strength
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)

**2. MQTT connection fails**

- Verify broker IP address and port
- Check firewall settings
- Ensure broker is running: `netstat -an | grep 1883`

**3. No data in dashboard**

- Check MQTT topic subscriptions match between services
- Verify MongoDB connection
- Check backend logs: `docker-compose logs backend`

**4. Calculation errors (x,y,z = 0)**

- Verify anchor coordinates in configuration
- Check distance offset settings
- Ensure all three sensors are publishing data
- Review distance values (should be positive and realistic)

**5. Docker containers won't start**

- Check port conflicts: `lsof -i :3000,8080,1883,27017`
- Verify Docker daemon is running
- Check disk space: `df -h`
- Review container logs: `docker-compose logs`

**6. Simulator not publishing**

- Ensure simulation profile is active: `docker-compose --profile simulate up`
- Check broker connectivity
- Use `stats` command to verify device status

### Debug Mode

**Enable verbose logging:**

Embedded firmware (`config.h`):

```cpp
#define LOG_LEVEL 3  // Maximum verbosity
```

Node.js (`config.json`):

```json
{
  "logging": {
    "level": "verbose"
  }
}
```

Docker backend:

```bash
docker-compose logs -f --tail=100 backend
```

## 📊 Data Format

### Distance Data (Sensor → Central Node)

```json
{
  "id": 1, // Sensor ID (1, 2, or 3)
  "d": 120 // Distance in cm
}
```

### Coordinate Data (Central Node → Gateway)

```json
{
  "deviceID": 1,
  "data": {
    "x": 105.5, // X coordinate (cm)
    "y": 65.3, // Y coordinate (cm)
    "z": 45.2, // Z coordinate (cm)
    "r": 12.5 // Error/radius value (cm)
  }
}
```

### CSV Log Format (`system/central_node/data/1.csv`)

```csv
time,d1,d2,d3,x,y,z
2025-11-29T12:00:00.000Z,120,150,180,105.5,65.3,45.2
```

## 📝 License

This project is available for educational and research purposes. Please check with the repository owner for specific licensing terms.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📧 Contact

For questions or support, please open an issue on the GitHub repository.

---

**Last Updated**: November 29, 2025

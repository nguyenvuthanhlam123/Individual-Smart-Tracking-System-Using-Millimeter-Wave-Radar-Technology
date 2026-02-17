#!/bin/bash

# --- Kiểm tra và cài đặt jq nếu cần ---
if ! command -v jq &> /dev/null
then
    echo "jq không được tìm thấy. Vui lòng cài đặt jq."
    echo "Ví dụ: sudo apt-get install jq (trên Debian/Ubuntu)"
    exit 1
fi

# --- Lấy địa chỉ IP (ưu tiên IP mạng LAN) và cập nhật config.json ---
# Thử lấy IP từ hostname -I (thường hoạt động tốt trên Linux)
IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Nếu không thành công, thử cách khác (thích hợp hơn cho nhiều hệ thống Linux)
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -n 1)
fi

# Nếu vẫn không thành công (có thể là macOS), thử cách này
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS=$(ipconfig getifaddr en0) # Thay en0 bằng giao diện mạng chính của bạn nếu cần
fi

# Nếu vẫn không tìm thấy IP, báo lỗi và thoát
if [ -z "$IP_ADDRESS" ]; then
    echo "Không thể tự động tìm thấy địa chỉ IP. Vui lòng kiểm tra kết nối mạng hoặc đặt IP thủ công trong config.json."
    exit 1
fi

echo "Sử dụng địa chỉ IP: $IP_ADDRESS"

# --- Cập nhật deviceGatewayUrl trong central_node/config.json bằng jq ---
CONFIG_FILE="central_node/config.json"
TEMP_CONFIG_FILE="central_node/config.tmp.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Lỗi: Không tìm thấy tệp $CONFIG_FILE."
    exit 1
fi

jq --arg ip "$IP_ADDRESS" '.mqttConfig.deviceGatewayUrl = "mqtt://" + $ip + ":1885"' "$CONFIG_FILE" > "$TEMP_CONFIG_FILE" && mv "$TEMP_CONFIG_FILE" "$CONFIG_FILE"

if [ $? -eq 0 ]; then
    echo "Đã cập nhật $CONFIG_FILE với IP: $IP_ADDRESS"
else
    echo "Lỗi khi cập nhật $CONFIG_FILE. Vui lòng kiểm tra tệp và quyền."
    exit 1
fi

# -------------------------------------------------------------------
# Phần còn lại của tập lệnh (npm install, khởi chạy terminal...)
# -------------------------------------------------------------------

# Define an array of directories containing your Node.js projects
PROJECT_DIRS=("central_node" "dashboard" "devices")

# Define an array of individual device files
DEVICE_FILES=("devices/device1.js" "devices/device2.js" "devices/device3.js")

# Define the executive file
EXECUTIVE_FILE="server"

# --- Terminal detection (Modify if needed for your specific terminal) ---
if [[ -n "$GNOME_TERMINAL_SCREEN" ]]; then
    TERMINAL_CMD="gnome-terminal --"
elif [[ -n "$XTERM_VERSION" ]]; then
    TERMINAL_CMD="xterm -e"
elif [[ -n "$KONSOLE_VERSION" ]]; then
    TERMINAL_CMD="konsole -e"
elif [[ -n "$TERMINATOR_UUID" ]]; then
    TERMINAL_CMD="terminator -e"
elif [[ -n "$TMUX" ]]; then
    TERMINAL_CMD="tmux new-window"
elif [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
    TERMINAL_CMD="open -a Terminal.app"
else
    echo "Could not detect terminal. Defaulting to xterm. You might need to install it or modify this script."
    TERMINAL_CMD="xterm -e"
fi

# --- Dependency Installation ---
for dir in "${PROJECT_DIRS[@]}"; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "node_modules not found in $dir, running npm install..."
    (cd "$dir" && npm install)
  fi
done

# --- Application Launch in New Terminals ---
echo "Starting central_node.js in a new terminal..."
$TERMINAL_CMD bash -c "node central_node/central_node.js; exec bash" &

echo "Starting dashboard.js in a new terminal..."
$TERMINAL_CMD bash -c "node dashboard/dashboard.js; exec bash" &

for device_file in "${DEVICE_FILES[@]}"; do
  echo "Starting $device_file in a new terminal..."
  $TERMINAL_CMD bash -c "node $device_file; exec bash" &
done

echo "Starting the server in a new terminal..."
$TERMINAL_CMD bash -c "./$EXECUTIVE_FILE; exec bash" &

echo "All processes started in separate terminals."

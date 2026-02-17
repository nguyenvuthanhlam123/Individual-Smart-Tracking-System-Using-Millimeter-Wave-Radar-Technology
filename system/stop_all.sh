#!/bin/bash

echo "Đang cố gắng dừng tất cả các tiến trình..."

# Dừng các tiến trình Node.js dựa trên tên tệp
pkill -f "node central_node/central_node.js"
pkill -f "node dashboard/dashboard.js"
pkill -f "node devices/device1.js"
pkill -f "node devices/device2.js"
pkill -f "node devices/device3.js"

# Dừng tiến trình server
pkill -f "./server"

echo "Đã gửi tín hiệu dừng đến các tiến trình."

# Tùy chọn: Đóng tất cả các cửa sổ terminal đã mở (Cẩn thận!)
# Dòng này sẽ cố gắng đóng tất cả các cửa sổ terminal. Hãy sử dụng cẩn thận
# vì nó có thể đóng cả những cửa sổ bạn không muốn đóng.
# Bạn có thể bỏ qua hoặc xóa dòng này nếu không cần.
# pkill gnome-terminal # Hoặc xterm, konsole, terminator, Terminal.app tùy thuộc vào terminal của bạn

echo "Hoàn tất."

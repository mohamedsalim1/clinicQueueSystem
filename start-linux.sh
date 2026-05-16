#!/bin/bash

# مركز داريا الطبي - تشغيل التطبيق على Linux
# Daraya Medical Center - Linux Desktop App Launcher

echo "==========================================="
echo "  مركز داريا الطبي - إصدار Linux"
echo "  Daraya Medical Center - Linux Desktop"
echo "==========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're in the right directory
if [ ! -d "$SCRIPT_DIR/frontend" ]; then
    echo "خطأ: يجب تشغيل هذا الملف من مجلد المشروع الجذر"
    echo "Error: Run this file from the project root directory"
    exit 1
fi

cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "خطأ: Node.js مطلوب لتشغيل الخادم"
    echo "Error: Node.js is required to run the server"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "بدء تشغيل الخادم..."
npm start > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
echo "انتظار بدء الخادم..."
sleep 3

# Check if server is running
if ! curl -s http://localhost:3000/api/queue/display/all > /dev/null 2>&1; then
    echo "خطأ: فشل في بدء الخادم"
    echo "Error: Failed to start server"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "الخادم يعمل على: http://localhost:3000"
echo "Server running at: http://localhost:3000"

# Check if AppImage exists and is executable
APPIMAGE_PATH="$SCRIPT_DIR/frontend/src-tauri/target/release/bundle/appimage/مركز داريا الطبي_1.0.0_amd64.AppImage"

if [ -f "$APPIMAGE_PATH" ] && [ -x "$APPIMAGE_PATH" ]; then
    echo "تشغيل التطبيق السطحي..."
    echo "Launching desktop app..."
    "$APPIMAGE_PATH"
else
    echo "تحذير: لم يتم العثور على AppImage، تشغيل الإصدار الويب"
    echo "Warning: AppImage not found, launching web version"
    echo "افتح المتصفح واذهب إلى: http://localhost:3000"
    echo "Open browser and go to: http://localhost:3000"
    echo "اضغط Ctrl+C لإيقاف الخادم"
    echo "Press Ctrl+C to stop the server"
    wait $SERVER_PID
fi

# Cleanup
kill $SERVER_PID 2>/dev/null
echo "تم إيقاف النظام"
echo "System stopped"
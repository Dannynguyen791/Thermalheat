@echo off
cd /d "%~dp0"
set WEB_PASSWORD=thermal2026
start "" /min node server.js
start "" "http://127.0.0.1:8080/"

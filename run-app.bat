@echo off
cd /d "c:\_code\Clean Earth\ServiceManagementRN"
start cmd /k npx react-native start
timeout /t 5
call npx react-native run-android

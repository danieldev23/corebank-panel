#!/bin/bash

# Dùng npx chạy concurrently để gộp chung 2 process vào 1 màn hình terminal
npx concurrently --kill-others -c "bgBlue.bold,bgMagenta.bold" \
    -n "FRONTEND,BACKEND" \
    "npm run dev" "npm run server"
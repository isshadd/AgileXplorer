#!/bin/bash

# Install MongoDB-related dependencies
npm install @nestjs/mongoose mongoose

# Install WebSocket dependencies with legacy peer deps
npm install @nestjs/platform-socket.io @nestjs/websockets --legacy-peer-deps

# Install types for development
npm install -D @types/mongoose
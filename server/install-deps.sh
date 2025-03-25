#!/bin/bash

# Install NestJS dependencies
npm install @nestjs/platform-socket.io@10.0.0 socket.io@4.7.1
npm install @nestjs/mongoose mongoose
npm install @types/socket.io --save-dev

# Install other required dependencies
npm install @nestjs/websockets

# Install types for development
npm install -D @types/mongoose
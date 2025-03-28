const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Test start mission
  socket.emit('startMission');
});

socket.on('missionStarted', (data) => {
  console.log('Mission started:', data);
  
  // Test stop mission after 2 seconds
  setTimeout(() => {
    socket.emit('stopMission');
  }, 2000);
});

socket.on('missionStopped', (data) => {
  console.log('Mission stopped:', data);
  process.exit(0);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
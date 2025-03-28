const { io } = require('socket.io-client');

// Connect to WebSocket server
const socket = io('http://localhost:3000');

// Track mission ID for later use
let currentMissionId = null;

socket.on('connect', () => {
  console.log('🔌 Connected to server');
  
  // Start a mission
  socket.emit('startMission', {}, (response) => {
    console.log('🚀 Mission started:', response);
    currentMissionId = response.missionId;

    // Wait 5 seconds to collect some logs
    console.log('⏳ Collecting logs for 5 seconds...');
    setTimeout(() => {
      // Request logs for the mission
      console.log(`📝 Requesting logs for mission ${currentMissionId}`);
      socket.emit('requestMissionLogs', currentMissionId);

      // Stop mission after getting logs
      setTimeout(() => {
        console.log('🛑 Stopping mission...');
        socket.emit('stopMission', {}, (response) => {
          if (response.data.success) {
            console.log('✅ Mission stopped successfully:', response.data);
            // Wait a bit to ensure logs are finalized
            setTimeout(() => {
              console.log('👋 Disconnecting...');
              socket.disconnect();
              process.exit(0);
            }, 2000);
          } else {
            console.error('❌ Failed to stop mission:', response.data);
            socket.disconnect();
            process.exit(1);
          }
        });
      }, 1000);
    }, 5000);
  });
});

// Listen for mission logs
socket.on('missionLogs', (logs) => {
  console.log('\n📊 Received mission logs:');
  console.log('Total log entries:', logs.length);
  
  // Group logs by type
  const sensorLogs = logs.filter(log => log.type === 'SENSOR');
  const commandLogs = logs.filter(log => log.type === 'COMMAND');
  
  console.log('\n📡 Sensor Logs:', sensorLogs.length);
  if (sensorLogs.length > 0) {
    console.log('Sample sensor log:');
    console.log(JSON.stringify(sensorLogs[0], null, 2));
  }
  
  console.log('\n⌨️  Command Logs:', commandLogs.length);
  if (commandLogs.length > 0) {
    console.log('Sample command log:');
    console.log(JSON.stringify(commandLogs[0], null, 2));
  }
});

// Listen for mission updates
socket.on('missionUpdate', (update) => {
  console.log('🔄 Mission update:', update);
});

// Listen for mission stopped event
socket.on('missionStopped', (result) => {
  console.log('✅ Mission stopped:', result);
  console.log('📊 Mission completed successfully');
  // Give a moment for any final logs to be processed
  setTimeout(() => {
    console.log('👋 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

// Error handling
socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
  process.exit(0);
});
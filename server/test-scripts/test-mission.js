const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const baseUrl = 'http://localhost:3000/robot';

async function testMissionFlow() {
  try {
    // Start mission
    console.log('Starting mission...');
    const startResponse = await fetch(`${baseUrl}/start-mission`, {
      method: 'POST'
    });
    const startData = await startResponse.json();
    console.log('Mission started:', startData);

    // Wait for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get mission logs
    console.log('\nFetching mission logs...');
    const logsResponse = await fetch(`${baseUrl}/mission/${startData.missionId}/logs`);
    const logsData = await logsResponse.json();
    console.log('Mission logs:', logsData);

    // Stop mission
    console.log('\nStopping mission...');
    const stopResponse = await fetch(`${baseUrl}/stop-mission`, {
      method: 'POST'
    });
    const stopData = await stopResponse.json();
    console.log('Mission stopped:', stopData);

    // Get final logs
    console.log('\nFetching final logs...');
    const finalLogsResponse = await fetch(`${baseUrl}/mission/${startData.missionId}/logs`);
    const finalLogsData = await finalLogsResponse.json();
    console.log('Final mission logs:', finalLogsData);

  } catch (error) {
    console.error('Error:', error);
  }
}

testMissionFlow();
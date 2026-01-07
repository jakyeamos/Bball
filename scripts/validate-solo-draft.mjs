
import { io } from 'socket.io-client';
import { DRAFT_CONSTRAINTS } from '../shared/dist/index.js';

const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;
const STARTUP_DELAY_MS = 5000; // 5 seconds

console.log(`Waiting ${STARTUP_DELAY_MS / 1000} seconds for the server to start...`);

setTimeout(() => {
  console.log(`Attempting to connect to server at ${SERVER_URL}...`);
  const socket = io(SERVER_URL, {
    transports: ['websocket'], // Force WebSocket transport
  });

  socket.on('connect', () => {
    console.log('Successfully connected to server');

    const lobbyConfig = {
      teamCount: 1,
      rosterSize: DRAFT_CONSTRAINTS.ROSTER_MIN,
      pickTimer: DRAFT_CONSTRAINTS.PICK_TIMER_OPTIONS_SECONDS[0],
    };

    console.log('Emitting "create:lobby" event with config:', lobbyConfig);
    socket.emit('create:lobby', {
      displayName: 'Solo Tester',
      config: lobbyConfig,
    });
  });

  socket.on('lobby:created', (lobby) => {
    console.log('Received "lobby:created" event with lobby state:', lobby);
    if (lobby.payload.canStart) {
      console.log('✅ Test passed: canStart is true for a single user');
      socket.disconnect();
      process.exit(0);
    } else {
      console.error('❌ Test failed: canStart is false for a single user');
      socket.disconnect();
      process.exit(1);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    process.exit(1);
  });

  socket.on('error', (error) => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  });

}, STARTUP_DELAY_MS);

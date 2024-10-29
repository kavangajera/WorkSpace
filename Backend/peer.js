const express = require('express');
const { ExpressPeerServer } = require('peer');

const app = express();
const PORT = 3002;

// CORS configuration for PeerJS
const corsOptions = {
    origin: 'http://localhost:5173', // Specify your client URL here
    methods: ["GET", "POST"],
    credentials: true,
};

// Set up PeerJS server with CORS
const server = app.listen(PORT, () => {
    console.log(`PeerJS Server is running on port ${PORT}`);
});
const peerServer = ExpressPeerServer(server, {
    debug: true,
    cors: corsOptions,
});

app.use('/peerjs', peerServer);

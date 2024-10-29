const express = require('express');
const cors = require('cors');
const http = require('http');
const app = express();

const server = http.createServer(app);

// CORS configuration
const corsOptions = {
    origin: '*', // Specify your client URL here
    methods: ["GET", "POST"],
    credentials: true,
};

app.use(cors(corsOptions)); // Apply CORS to the Express app as well

// Basic route
app.get('/', (req, res) => {
    res.status(200).send("Hello");
});

// Object to keep track of users in rooms
const usersInRoom = {};

// Set up Socket.IO
const io = require('socket.io')(server, {
    cors: {
        origin: "*", // Specify your client URL here
        methods: ["GET", "POST"],
        credentials: true,
    }
});

io.on('connection', (socket) => {
    socket.on('join-room', (roomId,id) => {
        console.log(`User joined room: ${roomId}`);
        socket.join(roomId);
        
        if (!usersInRoom[roomId]) {
            usersInRoom[roomId] = [];
        }

        if (!usersInRoom[roomId].includes(socket.id)) {
            usersInRoom[roomId].push(socket.id);
            socket.to(roomId).emit('user-connected' , id);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in usersInRoom) {
            usersInRoom[roomId] = usersInRoom[roomId].filter(userId => userId !== socket.id);
            if (usersInRoom[roomId].length === 0) {
                delete usersInRoom[roomId];
            }
        }
    });
});

// Start the Socket.IO server on port 3001
const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Socket.IO Server is running on port ${PORT}`);
});

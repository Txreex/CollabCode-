// index.js
const express = require('express')
const { Server } = require('socket.io')
const { createServer } = require('http')

const app = express()
const server = createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
})

const PORT = 3000

app.get('/', (req, res) => {
    res.send("Hello World")
})

let count = 0;
let code = '';

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id)

     // Send the current count when someone connects
    socket.emit('update-counter', count);

    socket.on('code-change', (change)=>{
        code = change;
        socket.broadcast.emit('changed-code',code);
    })

    // Listen for 'increment' event from a client
    socket.on('increment', () => {
        count++;
        // Broadcast the updated count to all connected clients
        io.emit('update-counter', count);
    });


    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, reason: ${reason}`)
    })
})

server.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
})

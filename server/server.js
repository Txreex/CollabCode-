const express = require('express');
const { Server } = require('socket.io');
const { createServer } = require('http');

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let count = 0;
let code = '';
let files = {}; // filename -> { content: '', count: number }

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Send existing files to new user
    if (Object.keys(files).length > 0) {
        console.log('📤 Sending existing files to new user:', Object.keys(files));
        for (const filename of Object.keys(files)) {
            socket.emit('file_created', { filename, count: files[filename].count });
        }
    }

    // Send current code to new user
    if (code) {
        console.log('📤 Sending current code to new user');
        socket.emit('changed-code', code);
    }

    // Handle code sync
    socket.on('code-change', (change) => {
        console.log('📝 Code change from:', socket.id);
        code = change;
        socket.broadcast.emit('changed-code', code);
    });

    // Handle file creation - THIS IS THE IMPORTANT PART
    socket.on('file_create', (filename) => {
        console.log('📥 FILE CREATE EVENT RECEIVED!');
        console.log('📁 Creating file:', filename);
        
        // Check if file already exists
        if (files[filename]) {
            console.log('⚠️ File already exists:', filename);
            socket.emit('error', 'File already exists');
            return;
        }
        
        // Add file to files object
        count += 1;
        files[filename] = { content: '', count: count };
        
        console.log('✅ File created. Current count:', count);
        console.log('📤 Emitting file_created to all clients');
        
        // Emit to ALL clients (including sender)
        io.emit('file_created', { filename, count });
        
        console.log('📋 Current files:', Object.keys(files));
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });

    // Debug: Log all events
    socket.onAny((eventName, ...args) => {
        console.log(`🔍 ANY EVENT: ${eventName}`, args);
    });
});

server.listen(PORT, () => {
    console.log('🌐 Server running on http://localhost:3000');
});
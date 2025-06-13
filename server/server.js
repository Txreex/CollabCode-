const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

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

// Static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// File storage
let count = 0;
let files = {}; // { filename: { content: string, count: number } }

io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Send existing files to the newly connected user
    for (const filename in files) {
        socket.emit('file_created', {
            filename,
            count: files[filename].count
        });
    }

    // Handle code changes
    socket.on('code-change', ({ filename, content }) => {
        if (files[filename]) {
            files[filename].content = content;
            socket.broadcast.emit('changed-code', { filename, content });
            console.log(`📝 Code updated for: ${filename}`);
        }
    });

    // Handle file creation
    socket.on('file_create', (filename) => {
        if (files[filename]) {
            socket.emit('error', 'File already exists');
            console.warn(`⚠️ Attempted to create duplicate file: ${filename}`);
            return;
        }

        count += 1;
        files[filename] = { content: '', count };

        io.emit('file_created', { filename, count });
        console.log(`📁 File created: ${filename} (count: ${count})`);
    });

    // Send requested file content
    socket.on('request_file', (filename) => {
        const file = files[filename];
        if (file) {
            socket.emit('file_data', { filename, content: file.content });
            console.log(`📤 Sent content for: ${filename}`);
        } else {
            socket.emit('error', `File '${filename}' not found`);
            console.warn(`⚠️ File not found: ${filename}`);
        }
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
        console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });

    // Debug: Log all events
    socket.onAny((eventName, ...args) => {
        console.log(`🔍 Event: ${eventName}`, args);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
});

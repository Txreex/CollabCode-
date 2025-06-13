const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = 3000;

// Data stores
const folders = new Set();
const files = {}; // filename: content

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log(`🔗 Client connected: ${socket.id}`);

    // Sync everything to new client
    socket.emit('sync_all', {
        folders: Array.from(folders),
        files: Object.keys(files)
    });

    // Create folder
    socket.on('folder_create', (folderName) => {
        console.log(`📁 Creating folder: ${folderName}`);
        if (!folders.has(folderName)) {
            folders.add(folderName);
            io.emit('folder_created', folderName);
            console.log(`✅ Folder created and broadcasted: ${folderName}`);
        } else {
            console.log(`⚠️ Folder already exists: ${folderName}`);
        }
    });

    // Delete folder and all its contents
    socket.on('folder_delete', (folderName) => {
        console.log(`🗑️ Deleting folder: ${folderName}`);
        
        folders.forEach(f => {
            if (f === folderName || f.startsWith(folderName + "/")) {
                folders.delete(f);
                io.emit("folder_deleted", f);
                console.log(`🗑️ Deleted folder: ${f}`);
            }
        });

        Object.keys(files).forEach(filename => {
            if (filename.startsWith(folderName + "/")) {
                delete files[filename];
                io.emit("file_deleted", filename);
                console.log(`🗑️ Deleted file in folder: ${filename}`);
            }
        });
    });

    // Create file
    socket.on('file_create', ({ filename, folder }) => {
        // Clean the filename to remove any problematic characters
        const cleanFilename = filename ? filename.trim() : '';
        const fullPath = folder ? `${folder}/${cleanFilename}` : cleanFilename;
        
        console.log(`📄 Creating file: "${fullPath}" (original: "${filename}", folder: "${folder}")`);
        console.log(`🔍 Filename bytes:`, Array.from(fullPath).map(c => c.charCodeAt(0)));
        
        if (!files.hasOwnProperty(fullPath) && fullPath) {
            files[fullPath] = '';
            io.emit('file_created', {
                filename: fullPath,
                count: Object.keys(files).length,
                folder: folder || null
            });
            console.log(`✅ File created and broadcasted: "${fullPath}"`);
        } else if (!fullPath) {
            console.error(`❌ Invalid filename: "${filename}"`);
        } else {
            console.log(`⚠️ File already exists: "${fullPath}"`);
        }
    });

    // Delete file
    socket.on('file_delete', (filename) => {
        console.log(`🗑️ Received file_delete request for: "${filename}"`);
        console.log(`📋 Current files:`, Object.keys(files));
        console.log(`🔍 Filename type:`, typeof filename, `Length:`, filename.length);
        console.log(`🔍 Filename bytes:`, Array.from(filename).map(c => c.charCodeAt(0)));
        
        // Check if file exists using hasOwnProperty for more reliable checking
        if (files.hasOwnProperty(filename)) {
            delete files[filename];
            io.emit('file_deleted', filename);
            console.log(`✅ File deleted and broadcasted: "${filename}"`);
            console.log(`📋 Remaining files:`, Object.keys(files));
        } else {
            // Try to find the file with a more flexible search
            const availableFiles = Object.keys(files);
            const matchingFile = availableFiles.find(f => {
                console.log(`🔍 Comparing "${f}" (${f.length}) with "${filename}" (${filename.length})`);
                console.log(`🔍 File bytes:`, Array.from(f).map(c => c.charCodeAt(0)));
                return f === filename || f.trim() === filename.trim();
            });
            
            if (matchingFile) {
                delete files[matchingFile];
                io.emit('file_deleted', matchingFile);
                console.log(`✅ File found and deleted: "${matchingFile}"`);
            } else {
                console.error(`❌ File not found in server storage: "${filename}"`);
                console.log(`📋 Available files:`, availableFiles);
                // Still broadcast the deletion event in case the client has it
                io.emit('file_deleted', filename);
                console.log(`📤 Broadcasted file_deleted anyway: "${filename}"`);
            }
        }
    });

    // Request file content
    socket.on('request_file', (filename) => {
        console.log(`📄 File content requested: ${filename}`);
        const content = files[filename] || '';
        socket.emit('file_data', { filename, content });
        console.log(`📤 Sent file data for: ${filename} (${content.length} characters)`);
    });

    // Code change
    socket.on('code-change', ({ filename, content }) => {
        console.log(`✏️ Code changed for: ${filename} (${content.length} characters)`);
        files[filename] = content;
        socket.broadcast.emit('changed-code', { filename, content });
    });

    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 Initial state - Folders:`, Array.from(folders), `Files:`, Object.keys(files));
});
console.log("Client.js loaded");

let currentFile = null;
const fileContents = {};  // local cache of file contents

const socket = io('http://localhost:3000/');

// Connection status logging
socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
});

// --- Code editor sync ---
const textarea = document.getElementById("editor");
if (!textarea) {
    console.error("❌ Textarea with id 'editor' not found!");
} else {
    console.log("✅ Found textarea element");
}

textarea.addEventListener('input', () => {
    if (!currentFile) return;
    const content = textarea.value;
    fileContents[currentFile] = content;

    socket.emit('code-change', { filename: currentFile, content });
});


socket.on('changed-code', (code) => {
    console.log("📝 Received code change from server");
    textarea.value = code;
});

// --- File creation ---

function filing(filename, count) {
    console.log(`📁 Creating file element: ${filename} (count: ${count})`);
    const file = document.createElement("div");
    file.className = "file";
    file.id = `file-${count}`;
    file.innerText = filename;

    file.addEventListener("click", () => {
        console.log(`📂 Selected file: ${filename}`);
        currentFile = filename;

        // If we already have local content, load it
        if (fileContents[filename] !== undefined) {
            textarea.value = fileContents[filename];
        } else {
            // If not, request it from server
            socket.emit('request_file', filename);
        }

        // Highlight selected file
        document.querySelectorAll(".file").forEach(f => f.classList.remove("active"));
        file.classList.add("active");
    });

    return file;
}

const box = document.getElementById("box");
const file_input = document.getElementById("file-name");
const add = document.getElementById("add");

// Check if all elements exist
if (!box) {
    console.error("❌ Element with id 'box' not found!");
} else {
    console.log("✅ Found box element");
}

if (!file_input) {
    console.error("❌ Element with id 'file-name' not found!");
} else {
    console.log("✅ Found file input element");
}

if (!add) {
    console.error("❌ Element with id 'add' not found!");
} else {
    console.log("✅ Found add button element");
}

// Add button click handler
add.addEventListener('click', () => {
    console.log("🔘 Add button clicked");
    const name = file_input.value.trim();
    console.log("📝 File name entered:", name);
    
    if (name !== '') {
        console.log("📤 Emitting file_create with:", name);
        socket.emit('file_create', name);
        file_input.value = '';
        console.log("✅ Input cleared");
    } else {
        console.warn("⚠️ Empty file name, not creating file");
    }
});

// Listen for file creation response
socket.on('file_created', ({ filename, count }) => {
    console.log("📥 Received file_created:", filename, count);
    const div = filing(filename, count);
    box.appendChild(div);
    console.log("✅ File added to DOM");
});

socket.on('file_data', ({ filename, content }) => {
    console.log(`📥 Received content for ${filename}`);
    fileContents[filename] = content;       // cache it
    if (filename === currentFile) {
        textarea.value = content;
    }
});


// Listen for errors
socket.on('error', (error) => {
    console.error("❌ Server error:", error);
});

// Listen for existing files sync
socket.on('sync_files', (files) => {
    console.log("📥 Received existing files:", files);
});

console.log("🚀 All event listeners set up");

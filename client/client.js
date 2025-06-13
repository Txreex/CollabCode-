console.log("Client.js loaded");

let currentFile = null;
const socket = io('http://localhost:3000/');

// Elements
const textarea = document.getElementById("editor");
const box = document.getElementById("box");
const file_input = document.getElementById("file-name");
const add = document.getElementById("add");

// --- Sanity Checks ---
if (!textarea) console.error("❌ Textarea with id 'editor' not found!");
if (!box) console.error("❌ Element with id 'box' not found!");
if (!file_input) console.error("❌ Element with id 'file-name' not found!");
if (!add) console.error("❌ Element with id 'add' not found!");

// --- Connection Events ---
socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
});

// --- Textarea Input Handler ---
if (textarea) {
    textarea.addEventListener('input', () => {
        if (!currentFile) return;
        socket.emit('code-change', {
            filename: currentFile,
            content: textarea.value
        });
    });
}

// --- File Element Generator ---
function filing(filename, count) {
    const file = document.createElement("div");
    file.className = "file";
    file.id = `file-${count}`;
    file.innerText = filename;

    file.addEventListener("click", () => {
        currentFile = filename;
        socket.emit('request_file', filename);

        // UI highlighting
        document.querySelectorAll(".file").forEach(f => f.classList.remove("active"));
        file.classList.add("active");
    });

    return file;
}

// --- Create New File Button ---
if (add) {
    add.addEventListener('click', () => {
        const name = file_input.value.trim();
        if (name !== '') {
            socket.emit('file_create', name);
            file_input.value = '';
        }
    });
}

// --- Incoming Events ---
socket.on('file_created', ({ filename, count }) => {
    const div = filing(filename, count);
    box.appendChild(div);
});

socket.on('file_data', ({ filename, content }) => {
    if (filename === currentFile && textarea) {
        textarea.value = content;
    }
});

socket.on('changed-code', ({ filename, content }) => {
    if (filename === currentFile && textarea) {
        textarea.value = content;
    }
});

socket.on('error', (error) => {
    console.error("❌ Server error:", error);
});

socket.on('sync_files', (files) => {
    console.log("📥 Received existing files:", files);
});

console.log("🚀 All client listeners set up");

let currentFile = null;
const socket = io('http://localhost:3000/');

// Element references
const editor = document.getElementById("editor");
const folderBtn = document.getElementById("folder_btn");
const fileBtn = document.getElementById("file_btn");
const fileTree = document.getElementById("file-tree");
const currentFileDisplay = document.getElementById("current-file");

// Sanity checks
if (!editor) console.error("❌ Textarea with id 'editor' not found!");
if (!folderBtn) console.error("❌ Folder button not found!");
if (!fileBtn) console.error("❌ File button not found!");
if (!fileTree) console.error("❌ File tree container not found!");
if (!currentFileDisplay) console.error("❌ Current file display not found!");

function createFolderElement(folderName) {
    const folder = document.createElement("div");
    folder.className = "folder";

    const title = document.createElement("div");
    title.className = "folder-title";

    const label = document.createElement("span");
    label.innerText = `📁 ${folderName}`;
    label.style.cursor = "pointer";

    const addSubfolderBtn = document.createElement("button");
    addSubfolderBtn.textContent = "➕📁";
    addSubfolderBtn.title = "Add Subfolder";
    addSubfolderBtn.style.marginLeft = "10px";
    addSubfolderBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const subfolderName = prompt("Enter subfolder name:");
        if (subfolderName) {
            const fullPath = `${folderName}/${subfolderName}`;
            socket.emit("folder_create", fullPath);
        }
    });

    const addFileBtn = document.createElement("button");
    addFileBtn.textContent = "➕📄";
    addFileBtn.title = "Add File";
    addFileBtn.style.marginLeft = "5px";
    addFileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const fileName = prompt("Enter file name:");
        if (fileName) {
            socket.emit("file_create", { filename: fileName, folder: folderName });
        }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Delete Folder";
    deleteBtn.style.marginLeft = "5px";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this folder and all contents?")) {
            socket.emit("folder_delete", folderName);
        }
    });

    label.addEventListener("click", () => {
        contentArea.classList.toggle("collapsed");
    });

    title.appendChild(label);
    title.appendChild(addSubfolderBtn);
    title.appendChild(addFileBtn);
    title.appendChild(deleteBtn);

    const contentArea = document.createElement("div");
    contentArea.className = "folder-contents";
    folder.appendChild(title);
    folder.appendChild(contentArea);

    folder.setAttribute("data-folder", folderName);
    return folder;
}

function createFileElement(filename, count) {
    const file = document.createElement("div");
    file.className = "file";
    file.id = `file-${count}`;
    // Store the full filename path as a data attribute for reliable identification
    file.setAttribute("data-filename", filename);
    file.innerText = `📄 ${filename.split("/").pop()}`;

    file.addEventListener("click", () => {
        currentFile = filename;
        socket.emit('request_file', filename);

        document.querySelectorAll(".file").forEach(f => f.classList.remove("active"));
        file.classList.add("active");
        currentFileDisplay.textContent = `📄 ${filename}`;
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "Delete File";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this file?")) {
            socket.emit("file_delete", filename);
        }
    });

    file.appendChild(deleteBtn);
    return file;
}

folderBtn.addEventListener("click", () => {
    const folderName = prompt("Enter folder name:");
    if (folderName) {
        socket.emit("folder_create", folderName);
    }
});

fileBtn.addEventListener("click", () => {
    const fileName = prompt("Enter file name:");
    if (fileName) {
        socket.emit("file_create", { filename: fileName });
    }
});

socket.on("folder_created", (folderName) => {
    if (document.querySelector(`[data-folder='${folderName}']`)) return;

    const parentPath = folderName.split("/").slice(0, -1).join("/");
    const folderElement = createFolderElement(folderName);

    if (parentPath) {
        const parent = document.querySelector(`[data-folder='${parentPath}'] .folder-contents`);
        if (parent) {
            parent.appendChild(folderElement);
        }
    } else {
        fileTree.appendChild(folderElement);
    }
});

socket.on("folder_deleted", (folderName) => {
    const folder = document.querySelector(`[data-folder='${folderName}']`);
    if (folder) folder.remove();
});

socket.on("file_created", ({ filename, count, folder }) => {
    const fileElement = createFileElement(filename, count);
    const folderPath = filename.includes("/") ? filename.split("/").slice(0, -1).join("/") : null;

    if (folderPath) {
        const container = document.querySelector(`[data-folder='${folderPath}'] .folder-contents`);
        if (container) {
            container.appendChild(fileElement);
            return;
        }
    }
    fileTree.appendChild(fileElement);
});

// Fixed file deletion handler
socket.on("file_deleted", (filename) => {
    // Find the file element using the data-filename attribute for reliable identification
    const fileElement = document.querySelector(`[data-filename='${filename}']`);
    if (fileElement) {
        fileElement.remove();
    }
    
    // Clear editor if the deleted file was currently open
    if (currentFile === filename) {
        currentFile = null;
        editor.value = "";
        currentFileDisplay.textContent = "📄 No File Selected";
    }
});

socket.on("sync_all", ({ folders, files }) => {
    folders.sort((a, b) => a.length - b.length).forEach(folderName => {
        const folderElement = createFolderElement(folderName);
        const parentPath = folderName.split("/").slice(0, -1).join("/");
        const parent = document.querySelector(`[data-folder='${parentPath}'] .folder-contents`);
        if (parent) {
            parent.appendChild(folderElement);
        } else {
            fileTree.appendChild(folderElement);
        }
    });

    files.forEach((filename, index) => {
        socket.emit("file_create", { filename });
    });
});

socket.on("file_data", ({ filename, content }) => {
    if (filename === currentFile && editor) {
        editor.value = content;
    }
});

socket.on("changed-code", ({ filename, content }) => {
    if (filename === currentFile && editor && editor.value !== content) {
        editor.value = content;
    }
});

editor.addEventListener("input", () => {
    if (!currentFile) return;
    socket.emit("code-change", {
        filename: currentFile,
        content: editor.value
    });
});
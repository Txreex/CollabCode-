const socket = io('http://localhost:3000/');

// Listen for counter updates from server
socket.on('update-counter', (count) => {
    document.getElementById("counter").innerText = count;
});

// Emit 'increment' to server when button is clicked
const button = document.getElementById("button");
button.onclick = () => {
    socket.emit('increment');
};


socket.on('changed-code',(code)=>{
    textarea.value = code;
})

const textarea = document.getElementById("editor");
textarea.addEventListener('input', ()=>{
    socket.emit('code-change',textarea.value)
})




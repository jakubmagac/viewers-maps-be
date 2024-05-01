const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})

const myVideo = document.createElement('video')
myVideo.muted = "muted"
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const chatDisplay = document.getElementById('chat-display');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const contactId = document.getElementById('contact-input');

console.log(myVideo.muted)
const peers = {}

let clientId = undefined;

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream)

  myPeer.on('call', call => {
    call.answer(stream)

    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })

  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream)
  })

  socket.on('me', id => {
    clientId = id
  })
})

socket.on('user-disconected', userId => {
  console.log('disconect')
  if(peers[userId]) peers[userId].close()
})

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')

  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}

sendButton.addEventListener('click', () => {
  const message = chatInput.value;
  if (message.trim() !== '') {
    socket.emit('chat-message', { from: clientId, to: contactId.value, message });
    displayMessage(clientId, message);
    chatInput.value = '';
  }
});

// uploadButton.addEventListener('click', () => {
//   console.log("Upload button clicked"); // Check if this message appears in the console
//   const file = fileInput.files[0];
//   console.log("Selected file:", file); // Check if the selected file is logged
//   if (file) {
//     sendFile(file);
//   }
// });

// function sendFile(file) {
//   const reader = new FileReader();
//   reader.onload = () => {
//     const fileData = reader.result;
//     socket.emit('file-uploaded', { filename: file.name, data: fileData });
//   };
//   reader.readAsDataURL(file);
// }

socket.on('chat-message', (data) => {
  displayMessage(data.from, data.message);
});

// socket.on('file-uploaded', (filename, data) => {
//   if (data && data.hasOwnProperty('data')) { // Check if 'data' exists and has the 'data' property
//     displayFile(filename, data.data);
//   } else {
//     console.error("Invalid file data received:", data);
//     alert("Error: Failed to receive file data from the server.");
//   }
// });

function displayMessage(username, message) {
  const messageElement = document.createElement('div');
  messageElement.innerText = `Užívateľ: ${username} píše: ${message}`;
  chatDisplay.appendChild(messageElement);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// function displayFile(filename, data) {
//   if (data) {
//     // Create a blob from the base64 data
//     const byteCharacters = atob(data);
//     const byteNumbers = new Array(byteCharacters.length);
//     for (let i = 0; i < byteCharacters.length; i++) {
//       byteNumbers[i] = byteCharacters.charCodeAt(i);
//     }
//     const byteArray = new Uint8Array(byteNumbers);
//     const blob = new Blob([byteArray], { type: 'application/octet-stream' });

//     // Create a link element to download the file
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = filename;
//     link.innerText = filename;

//     // Append the link to the chat display
//     chatDisplay.appendChild(link);
//     chatDisplay.appendChild(document.createElement('br')); // Add a line break for spacing
//   } else {
//     console.error("File data is null or undefined");
//   }
// }

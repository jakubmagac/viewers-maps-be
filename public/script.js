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


const shareScreenButton = document.getElementById('share-screen-button');
let screenStream = null;
let screenSharing = false;

shareScreenButton.addEventListener('click', () => {
  if (!screenSharing) {
    startScreenSharing();
  } else {
    stopScreenSharing();
  }
});

function startScreenSharing() {
  navigator.mediaDevices.getDisplayMedia({ video: true })
    .then(stream => {
      screenStream = stream;
      addVideoStream(stream);
      shareScreenButton.innerText = 'Zastaviť zdieľanie obrazovky';
      const videoTrack = stream.getVideoTracks()[0];
      console.log(videoTrack)

      console.log(peers)
      Object.values(peers).forEach(peer => {
        const sender = peer.peerConnection.getSenders().find(sender => sender.track.kind === videoTrack.kind);
        sender.replaceTrack(videoTrack);


        console.log(sender)
      });
      screenSharing = true;


      // Broadcast screen sharing to all users in the room
      socket.emit('screen-sharing', contactId.value);
      
      // Connect to screen sharing for existing users
      connectToScreenSharing();
    })
    .catch(error => {
      console.error('Error accessing screen:', error);
      alert('Error accessing screen: ' + error);
    });
}

socket.on('screen-sharing', () => {
  // When someone starts screen sharing, connect to their screen stream
  connectToScreenSharing();
});

function connectToScreenSharing() {

  const videoTrack = screenStream.getVideoTracks()[0];
  Object.values(peers).forEach(peer => {
    const sender = peer.peerConnection.getSenders().find(sender => sender.track.kind === videoTrack.kind);
    if (sender) {
      sender.replaceTrack(videoTrack);
    } else {
      const screenCall = myPeer.call(peer.peer, screenStream);
      const screenVideo = document.createElement('video');
      screenCall.on('stream', userScreenStream => {
        addVideoStream(screenVideo, userScreenStream);
      });
      screenCall.on('close', () => {
        screenVideo.remove();
      });
      peers[peer.peer] = screenCall;
    }
  });

}

// Modify the connectToNewUser function to handle both video stream and screen sharing stream
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
  // If screen sharing is active, connect to the screen sharing stream as well
  if (screenSharing) {
    const screenCall = myPeer.call(userId, screenStream);
    const screenVideo = document.createElement('video');
    screenCall.on('stream', userScreenStream => {
      addVideoStream(screenVideo, userScreenStream);
    });
    screenCall.on('close', () => {
      screenVideo.remove();
    });
    peers[userId] = screenCall;
  }
}


// function stopScreenSharing() {
//   screenStream.getTracks().forEach(track => track.stop());
//   document.querySelectorAll('video').forEach(video => {
//     if (video.srcObject === screenStream) {
//       video.remove();
//     }
//   });
//   screenSharing = false;
//   shareScreenButton.innerText = 'Zdieľať obrazovku';
// }
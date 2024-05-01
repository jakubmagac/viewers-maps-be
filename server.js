const express = require('express')
const app = express()
const server = require('http').Server(app)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
// Store chat messages for each room
const chatHistory = {};

const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ["GET", "POST"]
  }
})
const cors = require('cors')
server.listen(8080)

app.use(cors())
app.set('view engine', 'ejs')
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.render('room')
})

io.on('connection', socket => {
  console.log(socket.id)
  socket.emit('me', socket.id)

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("calling", {signal: data.signalData, from: data.from, name: data.name})
  })

  socket.on("answerCall", (data) => {
    console.log(data.to)
    io.to(data.to).emit("callAccepted", data.signal)
  })

  // Chat functionality
  socket.on('chat-message', (data) => {
    io.to(data.to).emit('chat-message', { from: data.from, message: data.message });
  });

  // Send chat history to the newly joined user, if available
  // if (chatHistory[roomId]) {
  //   chatHistory[roomId].forEach(({ sender, message }) => {
  //     socket.emit('chat-message', sender, message);
  //   });
  // }

  // File upload functionality
  socket.on('file-uploaded', (filename, data) => {
    // Broadcast the uploaded file to all users in the room
    io.to(roomId).emit('file-uploaded', filename, data);
  });

})


// Route for handling file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  // Get the file details
  const file = req.file;
  const filename = file.originalname;
  const filePath = file.path;

  // Broadcast the uploaded file to all users in the room
  io.to(req.body.roomId).emit('file-uploaded', filename, filePath); ///// TOTO NEPOJDE, troska inak sa to teraz posiela, treba to prepisat

  res.sendStatus(200);
});

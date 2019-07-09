const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const app = express();
const bodyParser = require('body-parser');
const isUrl = require('is-url');
const session = require('express-session');
const webshot = require('webshot');
const http = require('http').createServer(app);
const siofu = require("socketio-file-upload");
const io = require('socket.io')(http);

app.use(siofu.router);

let host;

class User {

  constructor(sessionId) {
    this.sessionId = sessionId;
    this.socketId = null;
    this.name = null;
  }

}

class Message {

  constructor({ user, isPrivate }) {
    this.user = user;
    this.isPrivate = isPrivate || false;
  }

  toJSON() {
    return {
      author: this.user.name,
      ...this,
      user: undefined,
      isPrivate: undefined
    }
  }

}

class TextMessage extends Message {

  constructor(options) {
    super(options);
    this.type = 'text';
    this.text = options.text;
  }

}

class WebsiteMessage extends TextMessage {

  constructor(options) {
    super(options);
    this.type = 'url';
    this.link = options.link;
    this.pictureUrl = options.pictureUrl;
  }

  static fetchUrlAndSend(user, text, link) {
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      link = 'http://' + link;
    }
    const fileName = crypto.createHash('sha1').update(link, 'utf-8').digest('hex') + '.jpg';
    const path = '/public/' + fileName;
    const localPath = __dirname + path;
    const remotePath = 'http://' + host + path;
    const appendMessage = () => {
      messages.push(new WebsiteMessage({
        user,
        text,
        pictureUrl: remotePath,
        link
      }));
      io.sockets.emit('message', messages[messages.length - 1]);
    };
    const fallbackMessage = () => {
      messages.push(new TextMessage({ user, text }));
      io.sockets.emit('message', messages[messages.length - 1]);
    };
    if (fs.existsSync(localPath)) {
      return appendMessage();
    }
    webshot(link, localPath, { defaultWhiteBackground: true, windowSize: { width: 800, height: 600 }, renderDelay: 1000 }, (err) => {
      if (err) {
        console.error('Error while fetching ' + link + ': ' + err.stack);
        return fallbackMessage();
      }
      appendMessage();
    })
  }

}

class PictureMessage extends Message {

  constructor(options) {
    super(options);
    this.type = 'media';
    this.pictureUrl = options.pictureUrl;
  }

}

const processIncomingMessage = (user, message) => {
  if (message.text) {
    let url = message.text.split(' ').find(word => isUrl(word));
    if (url) {
      return WebsiteMessage.fetchUrlAndSend(user, message.text, url);
    }
    messages.push(new TextMessage({ user, text: message.text }));
    io.sockets.emit('message', messages[messages.length - 1]);
  }
  // TODO: crop image with imagemagick and send it
};

const userFromRequest = (req, create = true) => {
  if (!usersBySession[req.session.id] && create) {
    usersBySession[req.session.id] = new User(req.session.id);
  }
  return usersBySession[req.session.id];
};

const usersBySession = {};
const messages = [];

app.use(session({
  name: 'sessionId',
  secret: process.env.SECRET || 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: false }
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(morgan('dev'));

app.use((req, res, next) => {
  if (!host) {
    host = req.headers.host;
    console.log('Detected host ' + host);
  }
  next();
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/me', (req, res) => {
  const user = userFromRequest(req);
  const data = {};
  if (user.name) {
    data.name = user.name;
  }

  res.json(data);
});

app.put('/me', (req, res) => {
  const user = userFromRequest(req);
  user.name = escape(req.body.name);
  res.json({
    name: escape(user.name)
  });
});

app.get('/messages', (req, res) => {
  res.json(messages.filter(message => !message.isPrivate));
});

app.post('/messages', (req, res) => {
  const user = userFromRequest(req, false);
  if (!user) { return res.sendStatus(401); }
  processIncomingMessage(user, req.body);
  res.end();
});

app.get('/private', (req, res) => {
  const user = userFromRequest(req);
  res.json(messages.filter(message => message.isPrivate && message.user === user));
});

app.use('/public', express.static('public'));

io.on('connection', (socket) => {
  const uploader = new siofu();
  uploader.dir = __dirname + '/public';
  uploader.listen(socket);

  uploader.on('saved', (event) => {
    messages.push(new PictureMessage({ user, pictureUrl: 'http://' + host + '/public/' + event.file.name }));
    io.sockets.emit('message', messages[messages.length - 1]);
  });

  let user;
  console.log('Socket ' + socket.id + ' connected!');
  socket.on('hello', function (sessionId) {
    sessionId = sessionId.substr(2, sessionId.indexOf('.') - 2);
    if (!usersBySession[sessionId]) { return; }
    user = usersBySession[sessionId];
    user.socketId = socket.id;
  });
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

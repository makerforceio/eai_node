var express = require('express')
var app = express()

var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.set('port', process.env.PORT || 3000);

var min = 3;
var pad = 2;

var redis = require("redis"),
    client = redis.createClient();

client.on("error", function (err) {
  console.log("Error " + err);
});

app.get('/init', function (req, res) {
  var max_list = 0;
  var max_length = 0;
  for (var i = 0; i < min+1+pad; ++i) {
    if (client.llen(i) > max_length) {
      max_list = i;
      max_length = client.llen(i);
    }
  }
  res.send(max_list)
});

app.post('/put_request', function (req, res) {
  if (req.body.key && req.body.params) {
    for (var i = 0; i < min+1+pad; ++i) {
      if (i != req.body.key) {
        res.json(redis.rpush(i, req.body.res));
      }
    }
  }
});

app.post('/get_request', function (req, res) {
  if (req.body.key) {
    res.json(redis.blpop(req.body.key));
  }
});

app.put('/put_answer', function (req, res) {
  if (req.body.params && req.body.gain) {
    redis.sadd(req.body.params, req.body.gain);
    redis.expire(req.body.params, 300);
  }
});

app.post('/get_answers', function (req, res) {
  if (req.body.params) {
    while (redis.scard(req.body.params) < min) {}
    redis.expire(req.body.params, 300);
    res.json(redis.smembers(req.body.params))
  }
});
var express = require('express')
var app = express()


var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

var min = 3;
var pad = 2;

var ip = 'redis';

var redis = require("redis"),
    client = redis.createClient({host:ip});

client.on("error", function (err) {
  console.log("Error " + err);
});

app.get('/init', function (req, res) {
  multi = client.multi();
  for (var i = 0; i < min+1+pad; ++i) {
    multi.llen(i)
  }
  multi.exec(function (err, replies) {
    var max_length = 0;
    var max_list = 0;
    for (var i = 0; i < min+1+pad; ++i) {
      if (replies[i] > max_length) {
        max_length = replies[i];
        max_list = i;
      }
    }
    res.send("" + max_list);
  });
});

app.post('/put_request', function (req, res) {
  if (req.body.key && req.body.params) {
    console.log(req.body.key);
    console.log(req.body.params);
    for (var i = 0; i < min+1+pad; ++i) {
      if ("" + i != req.body.key) {
        client.rpush(i, req.body.params);
      }
    }
    res.send("Yay!");
  }
  else {res.send("Neh!");}
});

app.post('/get_request', function (req, res) {
  if (req.body.key) {
    client.blpop(req.body.key, 0, function (err, reply) {
      res.send(reply[1]);
    });
  }
});

app.post('/put_answer', function (req, res) {
  if (req.body.params && req.body.gain) {
    client.sadd(req.body.params, req.body.gain);
    client.expire(req.body.params, 300);
    res.send("Whoo!")
  }
  res.send("Boohoo!");
});

app.post('/get_answers', function (req, res) {
  if (req.body.params) {
    function loop(err, reply) {
      client.expire(req.body.params, 300);
      if (reply < min) {
        client.scard(req.body.params, loop);
      }
      else {
        client.smembers(req.body.params, function (err, reply) {
          res.json(reply);
        });
      }
    }
    client.scard(req.body.params, loop);
  }
});

module.exports = app;

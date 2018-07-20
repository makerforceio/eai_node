var express = require('express')
var app = express()


var bodyParser = require('body-parser');

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ limit : '5mb', extended: true}));

var min = 3;
var pad = 2;

var ip = 'redis';

var redis = require("redis"),
    client = redis.createClient({host:ip});

client.on("error", function (err) {
  console.log("Error " + err);
});

app.get('/init', function (req, res) {
  console.log("Called - init");
  multi = client.multi();
  for (var i = 0; i < min+1+pad; ++i) {
    multi.llen(i)
  }
  multi.exec(function (err, replies) {
    var max_length = 0;
    var max_list = [0];
    for (var i = 0; i < min+1+pad; ++i) {
      if (replies[i] > max_length) {
        max_length = replies[i];
        max_list = [i];
      }
      else if (replies[i] == max_length) {
        max_list.push(i)
      }
    }
    max_list = max_list[Math.floor(Math.random() * (max_list.length - 1))];
    res.send("" + max_list);
    console.log("init sent - " + max_list);
  });
});

app.post('/put_request', function (req, res) {
  console.log("Called - put_request");
  if (req.body.key && req.body.params) {
    console.log(req.body.key);
    console.log(req.body.params);
    for (var i = 0; i < min+1+pad; ++i) {
      if ("" + i != req.body.key) {
        client.rpush(i, req.body.params);
      }
    }
    res.send("Yay!");
    console.log("put_request - Done");
  }
  else {res.send("Neh!");}
});

app.post('/get_request', function (req, res) {
  console.log("Called - get_request");
  if (req.body.key) {
    client.blpop(req.body.key, 0, function (err, reply) {
      res.send(reply[1]);
      console.log("get_request - Done");
    });
  }
});

app.post('/put_answer', function (req, res) {
  console.log("Called - put_answer");
  if (req.body.params && req.body.gain) {
    client.sadd(req.body.params, req.body.gain);
    client.expire(req.body.params, 300);
    res.send("Whoo!");
    console.log("put_answer - Done");
  }
  else {res.send("Boohoo!")};
});

app.post('/get_answers', function (req, res) {
  console.log("Called - get_answers");
  if (req.body.params) {
    var start_time = process.hrtime();
    function loop(err, reply) {
      client.expire(req.body.params, 300);
      if (reply < min) {
        client.scard(req.body.params, loop);
      }
      else if (process.hrtime() - start_time > 60 * 1000){
        res.json("Timeout");
      }
      else {
        client.smembers(req.body.params, function (err, reply) {
          res.json(reply);
          console.log("get_answers - Done");
        });
      }
    }
    client.scard(req.body.params, loop);
  }
});

module.exports = app;

'use strict';

var http = require('http'),
    https = require('https');

var Parser = require('newline-json').Parser;

var FilterStream = require('./FilterStream'),
    isNotHeartbeat = require('./isNotHeartbeat');

var jsonLinesClient = function (options, callback) {
  var filteredStream = new FilterStream(isNotHeartbeat);
  var protocol = options.protocol === 'http' ? http : https;

  var req = protocol.request({
    method: 'GET',
    hostname: options.host,
    port: options.port,
    path: options.path + '?_=' + Date.now(),
    withCredentials: false
  }, function (res) {
    var parser = new Parser();

    res.once('end', function () {
      if (res.statusCode !== 200) {
        filteredStream.emit('error', new Error('Unexpected status code ' + res.statusCode + '.'));
      }
    });

    filteredStream.once('end', function () {
      req.removeAllListeners();
      res.removeAllListeners();
      parser.removeAllListeners();
      filteredStream.removeAllListeners();
    });

    res.pipe(parser).pipe(filteredStream);
  });

  req.once('error', function (err) {
    filteredStream.emit('error', err);
  });

  req.end();
  callback(filteredStream);
};

module.exports = jsonLinesClient;

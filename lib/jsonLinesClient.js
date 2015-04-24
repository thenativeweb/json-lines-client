'use strict';

var http = require('http'),
    https = require('https');

var Parser = require('newline-json').Parser,
    qs = require('qs');

var errors = require('./errors'),
    FilterStream = require('./FilterStream'),
    isNotHeartbeat = require('./isNotHeartbeat');

var jsonLinesClient = function (options, callback) {
  var filteredStream = new FilterStream(isNotHeartbeat);
  var protocol = options.protocol === 'http' ? http : https;

  var cleanUpStreams,
      request,
      response;

  options.query = options.query || {};
  options.query._ = Date.now();

  request = protocol.request({
    method: 'GET',
    hostname: options.host,
    port: options.port,
    path: options.path + '?' + qs.stringify(options.query),
    withCredentials: false
  }, function (res) {
    var body,
        parser = new Parser();

    cleanUpStreams = function () {
      request.removeAllListeners();
      res.removeAllListeners();
      parser.removeAllListeners();
      filteredStream.removeAllListeners();

      res.resume();
      parser.end();
      filteredStream.end();
    };

    response = res;

    if (res.statusCode !== 200) {
      body = '';
      res.on('data', function (data) {
        body += data.toString();
      });

      res.once('end', function () {
        filteredStream.emit('error', new errors.UnexpectedStatusCode(body));
        cleanUpStreams();
      });

      return;
    }

    parser.once('error', function (err) {
      filteredStream.emit('error', new errors.InvalidJson('Could not parse JSON.', err));
      cleanUpStreams();
    });

    filteredStream.once('end', function () {
      cleanUpStreams();
    });

    res.pipe(parser).pipe(filteredStream);
  });

  request.once('error', function (err) {
    filteredStream.emit('error', err);
  });

  request.end();
  callback({
    stream: filteredStream,
    disconnect: function () {
      if (!response || !response.socket) {
        return;
      }
      response.socket.end();
    }
  });
};

module.exports = jsonLinesClient;

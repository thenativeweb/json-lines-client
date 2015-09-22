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

  var headers,
      req;

  headers = options.headers || {};
  headers['content-type'] = 'application/json';

  req = protocol.request({
    method: 'POST',
    hostname: options.host,
    port: options.port,
    path: options.path + (options.query ? ('?' + qs.stringify(options.query)) : ''),
    headers: headers
  }, function (res) {
    var body,
        parser = new Parser();

    var cleanUpStreams = function () {
      req.removeAllListeners();
      res.removeAllListeners();
      parser.removeAllListeners();
      filteredStream.removeAllListeners();

      // Workaround for browserify, since its stream implementation does
      // currently not know the resume function. For details see:
      // https://github.com/substack/http-browserify/issues/81
      if (res.resume) {
        res.resume();
      }
      parser.end();
      filteredStream.end();
    };

    callback({
      stream: filteredStream,
      disconnect: function () {
        if (res && res.socket && res.socket.end) {
          return res.socket.end();
        }
        if (req && req.destroy) {
          return req.destroy();
        }

        // We don't know how to close the connection, but this situation should
        // definitely be avoided.
      }
    });

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
      filteredStream.emit('error', err);
      cleanUpStreams();
    });

    filteredStream.once('end', function () {
      cleanUpStreams();
    });

    res.pipe(parser).pipe(filteredStream);
  });

  req.once('error', function (err) {
    callback({
      stream: filteredStream,
      disconnect: function () {}
    });

    filteredStream.emit('error', err);
  });

  if (options.body) {
    req.write(JSON.stringify(options.body));
  }
  req.end();
};

module.exports = jsonLinesClient;

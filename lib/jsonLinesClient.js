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
  var req;

  options.query = options.query || {};
  options.query._ = Date.now();

  req = protocol.request({
    method: 'GET',
    hostname: options.host,
    port: options.port,
    path: options.path + '?' + qs.stringify(options.query),
    withCredentials: false
  }, function (res) {
    var parser = new Parser();

    var cleanUpStreams = function () {
      req.removeAllListeners();
      res.removeAllListeners();
      parser.removeAllListeners();
      filteredStream.removeAllListeners();

      res.resume();
      parser.end();
      filteredStream.end();
    };

    if (res.statusCode !== 200) {
      filteredStream.emit('error', new errors.UnexpectedStatusCode('Unexpected status code ' + res.statusCode + '.'));
      filteredStream.end();
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

  req.once('error', function (err) {
    filteredStream.emit('error', err);
  });

  req.end();
  callback(filteredStream);
};

module.exports = jsonLinesClient;

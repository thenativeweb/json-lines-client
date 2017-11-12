'use strict';

const http = require('http'),
      https = require('https');

const Parser = require('newline-json').Parser,
      qs = require('qs');

const errors = require('./errors'),
      FilterStream = require('./FilterStream'),
      isNotHeartbeat = require('./isNotHeartbeat');

const jsonLinesClient = function (options, callback) {
  const filteredStream = new FilterStream(isNotHeartbeat);
  const protocol = options.protocol === 'http' ? http : https;

  const headers = options.headers || {};

  headers['content-type'] = 'application/json';

  const query = options.query ? `?${qs.stringify(options.query)}` : '';

  const req = protocol.request({
    method: 'POST',
    hostname: options.host,
    port: options.port,
    path: `${options.path}${query}`,
    headers
  }, res => {
    const parser = new Parser();

    const cleanUpStreams = function () {
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

    /* eslint-disable callback-return */
    callback({
      stream: filteredStream,
      disconnect () {
        // On Node.js, there are destroy functions for the request and for the
        // response.
        if (req && req.destroy && res && res.destroy) {
          req.destroy();
          res.destroy();

          return;
        }

        // In the browser, there is only a destroy function for the request.
        if (req && req.destroy) {
          return req.destroy();
        }

        // If both are not available (for whatever reason), check if you can
        // destroy the underlying socket.
        if (res && res.socket && res.socket.end) {
          return res.socket.end();
        }

        // If all fails, is apparently is not possible to close the connection.
        // This should definitely be avoided.
      }
    });
    /* eslint-enable callback-return */

    let body;

    if (res.statusCode !== 200) {
      body = '';
      res.on('data', data => {
        body += data.toString();
      });

      res.once('end', () => {
        const statusError = new errors.UnexpectedStatusCode(body);

        statusError.statusCode = res.statusCode;
        filteredStream.emit('error', statusError);
        cleanUpStreams();
      });

      return;
    }

    parser.once('error', err => {
      filteredStream.emit('error', err);
      cleanUpStreams();
    });

    filteredStream.once('end', () => {
      cleanUpStreams();
    });

    res.pipe(parser).pipe(filteredStream);
  });

  req.once('error', err => {
    /* eslint-disable callback-return */
    callback({
      stream: filteredStream,
      disconnect () {}
    });
    /* eslint-enable callback-return */

    filteredStream.emit('error', err);
  });

  if (options.body) {
    req.write(JSON.stringify(options.body));
  }
  req.end();
};

module.exports = jsonLinesClient;

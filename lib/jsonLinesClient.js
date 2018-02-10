'use strict';

const { Parser } = require('newline-json'),
      pump = require('pump');

const errors = require('./errors'),
      FilterStream = require('./FilterStream'),
      isNotHeartbeat = require('./isNotHeartbeat'),
      request = require('./request');

const jsonLinesClient = async function ({ protocol, host, port, path, query = {}, headers = {}, body = '' }) {
  headers['content-type'] = 'application/json';

  const res = await request({ protocol, host, port, path, query }, { json: body, headers });

  if (res.statusCode !== 200) {
    const err = new errors.StatusCodeUnexpected();

    err.status = res.statusCode;

    throw err;
  }

  const parser = new Parser();
  const filteredStream = new FilterStream(isNotHeartbeat);

  pump(res, parser, filteredStream, err => {
    // pump does not forward errors. Hence we need this callback to inform the
    // user if an error happened in the parser. There is a pull request for
    // this (https://github.com/mafintosh/pump/pull/32). Once this PR has been
    // merged, this callback can be removed entirely.
    if (err) {
      filteredStream.emit('error', err);
    }
  });

  return {
    stream: filteredStream,
    disconnect () {
      if (!res) {
        return;
      }

      if (res.destroy) {
        return res.destroy();
      }

      if (res.socket && res.socket.end) {
        return res.socket.end();
      }

      // If all fails, is apparently is not possible to close the connection.
      // This should definitely be avoided.
    }
  };
};

module.exports = jsonLinesClient;

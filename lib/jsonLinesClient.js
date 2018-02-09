'use strict';

const url = require('url');

const { Parser } = require('newline-json'),
      pump = require('pump'),
      r2 = require('r2');

const errors = require('./errors'),
      FilterStream = require('./FilterStream'),
      isNotHeartbeat = require('./isNotHeartbeat');

const jsonLinesClient = async function ({ protocol, host, port, path, query, headers = {}, body = {}}) {
  headers['content-type'] = 'application/json';

  const res = await r2.post(
    url.format({ protocol, hostname: host, port, pathname: path, query }),
    { json: body, headers }
  ).response;

  if (res.status !== 200) {
    const err = new errors.UnexpectedStatusCode();

    err.status = res.status;

    throw err;
  }

  const parser = new Parser();
  const filteredStream = new FilterStream(isNotHeartbeat);

  pump(res.body, parser, filteredStream, err => {
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

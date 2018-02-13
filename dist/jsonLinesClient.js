'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('newline-json'),
    Parser = _require.Parser,
    pump = require('pump');

var errors = require('./errors'),
    FilterStream = require('./FilterStream'),
    isNotHeartbeat = require('./isNotHeartbeat'),
    request = require('./request');

var jsonLinesClient = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(_ref2) {
    var protocol = _ref2.protocol,
        host = _ref2.host,
        port = _ref2.port,
        path = _ref2.path,
        _ref2$query = _ref2.query,
        query = _ref2$query === undefined ? {} : _ref2$query,
        _ref2$headers = _ref2.headers,
        headers = _ref2$headers === undefined ? {} : _ref2$headers,
        _ref2$body = _ref2.body,
        body = _ref2$body === undefined ? '' : _ref2$body;
    var res, err, parser, filteredStream;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            headers['content-type'] = 'application/json';

            _context.next = 3;
            return request({ protocol: protocol, host: host, port: port, path: path, query: query }, { json: body, headers: headers });

          case 3:
            res = _context.sent;

            if (!(res.statusCode !== 200)) {
              _context.next = 8;
              break;
            }

            err = new errors.StatusCodeUnexpected();


            err.status = res.statusCode;

            throw err;

          case 8:
            parser = new Parser();
            filteredStream = new FilterStream(isNotHeartbeat);


            pump(res, parser, filteredStream, function (err) {
              // pump does not forward errors. Hence we need this callback to inform the
              // user if an error happened in the parser. There is a pull request for
              // this (https://github.com/mafintosh/pump/pull/32). Once this PR has been
              // merged, this callback can be removed entirely.
              if (err) {
                filteredStream.emit('error', err);
              }
            });

            return _context.abrupt('return', {
              stream: filteredStream,
              disconnect: function disconnect() {
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
            });

          case 12:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function jsonLinesClient(_x) {
    return _ref.apply(this, arguments);
  };
}();

module.exports = jsonLinesClient;
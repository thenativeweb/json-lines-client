'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errors = require('./errors');

var request = function request(_ref, _ref2) {
  var protocol = _ref.protocol,
      host = _ref.host,
      port = _ref.port,
      path = _ref.path,
      query = _ref.query;
  var json = _ref2.json,
      headers = _ref2.headers;

  /* eslint-disable global-require */
  var http = require('http'),
      https = require('https');

  var qs = require('qs');
  /* eslint-enable global-require */

  return new _promise2.default(function (resolve, reject) {
    var wire = protocol === 'http' ? http : https;

    var req = wire.request({
      method: 'POST',
      hostname: host,
      port: port,
      path: path + '?' + qs.stringify(query),
      headers: headers
    }, function (res) {
      resolve(res);
    });

    var onReqError = void 0,
        onReqFinish = void 0;

    var unsubscribeReq = function unsubscribeReq() {
      req.removeListener('error', onReqError);
      req.removeListener('finish', onReqFinish);
    };

    onReqError = function onReqError() {
      unsubscribeReq();
      reject(new errors.RequestFailed());
    };

    onReqFinish = function onReqFinish() {
      unsubscribeReq();
    };

    req.on('error', onReqError);
    req.on('finish', onReqFinish);

    if (json) {
      req.write((0, _stringify2.default)(json));
    }
    req.end();
  });
};

module.exports = request;
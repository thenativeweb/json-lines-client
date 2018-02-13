'use strict';

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isNotHeartbeat = function isNotHeartbeat(data) {
  var keys = (0, _keys2.default)(data);

  return !(keys.length === 1 && keys[0] === 'name' && data.name === 'heartbeat');
};

module.exports = isNotHeartbeat;
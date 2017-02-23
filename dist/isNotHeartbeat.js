'use strict';

var isNotHeartbeat = function isNotHeartbeat(data) {
  var keys = Object.keys(data);

  return !(keys.length === 1 && keys[0] === 'name' && data.name === 'heartbeat');
};

module.exports = isNotHeartbeat;
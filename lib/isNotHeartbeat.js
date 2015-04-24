'use strict';

var isNotHeartbeat = function (data) {
  var keys = Object.keys(data);

  return !(
    (keys.length === 1) &&
    (keys[0] === 'name') &&
    (data.name === 'heartbeat')
  );
};

module.exports = isNotHeartbeat;

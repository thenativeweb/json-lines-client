'use strict';

const isNotHeartbeat = function (data) {
  const keys = Object.keys(data);

  return !(
    (keys.length === 1) &&
    (keys[0] === 'name') &&
    (data.name === 'heartbeat')
  );
};

module.exports = isNotHeartbeat;

'use strict';

const errors = require('./errors');

const request = function ({ protocol, host, port, path, query }, { json, headers }) {
  /* eslint-disable global-require */
  const http = require('http'),
        https = require('https');

  const qs = require('qs');
  /* eslint-enable global-require */

  return new Promise((resolve, reject) => {
    const wire = protocol === 'http' ? http : https;

    const req = wire.request({
      method: 'POST',
      hostname: host,
      port,
      path: `${path}?${qs.stringify(query)}`,
      headers
    }, res => {
      resolve(res);
    });

    let onReqError,
        onReqFinish;

    const unsubscribeReq = function () {
      req.removeListener('error', onReqError);
      req.removeListener('finish', onReqFinish);
    };

    onReqError = function () {
      unsubscribeReq();
      reject(new errors.RequestFailed());
    };

    onReqFinish = function () {
      unsubscribeReq();
    };

    req.on('error', onReqError);
    req.on('finish', onReqFinish);

    if (json) {
      req.write(JSON.stringify(json));
    }
    req.end();
  });
};

module.exports = request;

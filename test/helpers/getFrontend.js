'use strict';

const path = require('path');

const express = require('express');

const getFrontend = function () {
  const frontend = express();

  frontend.use('/', express.static(path.join(__dirname, '..', 'integration', 'frontend')));

  return frontend;
};

module.exports = getFrontend;

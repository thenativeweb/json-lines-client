'use strict';

var defekt = require('defekt');

var errors = defekt([
  'InvalidJson',
  'UnexpectedStatusCode'
]);

module.exports = errors;

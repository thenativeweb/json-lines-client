'use strict';

const defekt = require('defekt');

const errors = defekt([
  'RequestFailed',
  'StatusCodeUnexpected'
]);

module.exports = errors;

'use strict';

var defekt = require('defekt');

var errors = defekt(['RequestFailed', 'StatusCodeUnexpected']);

module.exports = errors;
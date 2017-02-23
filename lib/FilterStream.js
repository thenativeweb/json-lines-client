'use strict';

const stream = require('stream'),
      util = require('util');

const Transform = stream.Transform;

const FilterStream = function (predicate) {
  Reflect.apply(Transform, this, [{ objectMode: true }]);

  this.predicate = predicate;
};

util.inherits(FilterStream, Transform);

/* eslint-disable no-underscore-dangle */
FilterStream.prototype._transform = function (chunk, encoding, callback) {
/* eslint-enable no-underscore-dangle */
  if (this.predicate(chunk)) {
    this.push(chunk);
  }

  callback();
};

module.exports = FilterStream;

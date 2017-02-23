'use strict';

var stream = require('stream');

var inherits = require('inherits');

var Transform = stream.Transform;

var FilterStream = function FilterStream(predicate) {
  Reflect.apply(Transform, this, [{ objectMode: true }]);

  this.predicate = predicate;
};

inherits(FilterStream, Transform);

/* eslint-disable no-underscore-dangle */
FilterStream.prototype._transform = function (chunk, encoding, callback) {
  /* eslint-enable no-underscore-dangle */
  if (this.predicate(chunk)) {
    this.push(chunk);
  }

  callback();
};

module.exports = FilterStream;
'use strict';

const { Transform } = require('stream');

class FilterStream extends Transform {
  constructor (predicate) {
    super({ objectMode: true });

    this.predicate = predicate;
  }

  _transform (chunk, encoding, callback) {
    if (this.predicate(chunk)) {
      this.push(chunk);
    }

    callback();
  }
}

module.exports = FilterStream;

'use strict';

const http = require('http');

const assert = require('assertthat');

const getApp = require('../helpers/getApp'),
      jsonLinesClient = require('../../lib/jsonLinesClient');

suite('jsonLinesClient', () => {
  suiteSetup(() => {
    const app = getApp();

    http.createServer(app).listen(3000);
  });

  test('is a function.', async () => {
    assert.that(jsonLinesClient).is.ofType('function');
  });

  test('throws an error if the request fails.', async () => {
    await assert.that(async () => {
      await jsonLinesClient({
        protocol: 'http',
        host: 'localhost-xxx',
        port: 3000,
        path: '/'
      });
    }).is.throwingAsync(ex => ex.code === 'ENOTFOUND');
  });

  test('throws an error if the server returns an error.', async () => {
    await assert.that(async () => {
      await jsonLinesClient({
        protocol: 'http',
        host: 'localhost',
        port: 3000,
        path: '/non-existent'
      });
    }).is.throwingAsync(ex => ex.code === 'EUNEXPECTEDSTATUSCODE');
  });

  test('throws an error if the server returns a status code not equal to 200.', async () => {
    await assert.that(async () => {
      await jsonLinesClient({
        protocol: 'http',
        host: 'localhost',
        port: 3000,
        path: '/no-200'
      });
    }).is.throwingAsync(ex => ex.code === 'EUNEXPECTEDSTATUSCODE');
  });

  test('handles parser errors gracefully.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/flaky-json'
        });

        server.stream.on('data', () => {
          // Intentionally left blank...
        });

        server.stream.once('error', err => {
          assert.that(err).is.not.null();
          assert.that(err.message).is.startingWith('Unexpected token b in JSON');
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });

  test('sends a request body.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/echo-body',
          body: {
            foo: 'bar'
          }
        });

        server.stream.once('data', data => {
          assert.that(data).is.equalTo({
            foo: 'bar'
          });
        });

        server.stream.once('end', () => {
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });

  test('parses a finite stream.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/finite'
        });

        let resultCount = 0;

        server.stream.on('data', data => {
          assert.that(data.counter).is.between(0, 9);
          resultCount += 1;
        });

        server.stream.once('end', () => {
          assert.that(resultCount).is.equalTo(10);
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });

  test('handles large JSON objects.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/large-json'
        });

        let resultCount = 0;

        server.stream.on('data', () => {
          resultCount += 1;
        });

        server.stream.once('end', () => {
          assert.that(resultCount).is.equalTo(2);
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });

  test('parses an infinite stream.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/infinite'
        });

        server.stream.on('data', data => {
          assert.that(data.counter).is.between(0, 9);
          if (data.counter === 9) {
            server.disconnect();
          }
        });

        server.stream.once('end', () => {
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });

  test('sends query parameters.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/with-query',
          query: {
            foo: 42,
            bar: 'baz',
            bas: {
              key: 'value'
            }
          }
        });

        server.stream.once('data', data => {
          assert.that(data.result).is.true();
        });

        server.stream.once('end', () => {
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });

  test('sends custom headers.', done => {
    (async () => {
      try {
        const server = await jsonLinesClient({
          protocol: 'http',
          host: 'localhost',
          port: 3000,
          path: '/with-custom-headers',
          headers: {
            foo: 'bar'
          }
        });

        server.stream.once('data', data => {
          assert.that(data).is.equalTo({
            foo: 'bar',
            'content-type': 'application/json',
            host: 'localhost:3000',
            connection: 'close',
            'content-length': '0'
          });
        });

        server.stream.once('end', () => {
          done();
        });
      } catch (ex) {
        return done(ex);
      }
    })();
  });
});

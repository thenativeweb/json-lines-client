'use strict';

const http = require('http');

const assert = require('assertthat'),
      bodyParser = require('body-parser'),
      express = require('express'),
      jsonLines = require('json-lines');

const jsonLinesClient = require('../../lib/jsonLinesClient');

suite('jsonLinesClient', () => {
  suiteSetup(() => {
    const app = express();

    app.use(bodyParser.json());

    app.post('/no-200', (req, res) => {
      res.writeHead(500);
      res.end();
    });

    app.post('/echo-body', jsonLines(client => {
      client.once('connect', () => {
        client.send(client.req.body);
        client.disconnect();
      });
    }));

    app.post('/with-custom-headers', (req, res) => {
      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.write(`${JSON.stringify(req.headers)}\n`);
      res.end();
    });

    app.post('/with-query', jsonLines(client => {
      let result = false;

      client.once('connect', () => {
        if (
          (client.req.query.foo === '42') &&
          (client.req.query.bar === 'baz') &&
          (client.req.query.bas.key === 'value') &&
          (client.req.query._ !== '')
        ) {
          result = true;
        }

        client.send({ result });
        client.disconnect();
      });
    }));

    app.post('/finite', jsonLines(client => {
      let counter = 0;

      client.once('connect', () => {
        const timer = setInterval(() => {
          client.send({ counter });
          counter += 1;

          if (counter === 10) {
            clearInterval(timer);
            client.disconnect();
          }
        }, 100);
      });
    }));

    app.post('/infinite', jsonLines(client => {
      let counter = 0,
          timer;

      client.once('connect', () => {
        timer = setInterval(() => {
          client.send({ counter });
          counter += 1;
        }, 100);
      });

      client.once('disconnect', () => {
        clearInterval(timer);
      });
    }));

    app.post('/flaky-json', (req, res) => {
      res.writeHead(200, {
        'content-type': 'application/json'
      });

      res.write(`${JSON.stringify({ foo: 'bar' })}\n`);
      res.write(`${JSON.stringify({ foo: 'baz' })}\n`);
      res.write('boom\n');
      res.write(`${JSON.stringify({ foo: 'bas' })}\n`);
      res.end();
    });

    app.post('/large-json', (req, res) => {
      res.writeHead(200, {
        'content-type': 'application/json'
      });

      res.write(`${JSON.stringify({
        foo: 'bar',
        baz: 'bas',
        name: 'Jane Doe',
        location: 'Somewhere over the rainbow'
      })}\n`);
      res.write(`${JSON.stringify({
        foo: 'another-bar',
        baz: 'another-bas',
        name: 'John Doe',
        location: 'Somewhere else over the rainbow'
      })}\n`);
      res.end();
    });

    http.createServer(app).listen(3000);
  });

  test('is a function.', done => {
    assert.that(jsonLinesClient).is.ofType('function');
    done();
  });

  test('emits an error if the request fails.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost-xxx',
      port: 3000,
      path: '/'
    }, server => {
      server.stream.once('error', err => {
        assert.that(err).is.not.null();
        done();
      });
    });
  });

  test('emits an error if the server returns an error.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/non-existent'
    }, server => {
      server.stream.once('error', err => {
        assert.that(err).is.not.null();
        assert.that(err.code).is.equalTo('EUNEXPECTEDSTATUSCODE');
        assert.that(err.message).is.containing('Cannot POST /non-existent');
        done();
      });
    });
  });

  test('emits an error if the server returns a status code not equal to 200.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/no-200'
    }, server => {
      server.stream.once('error', err => {
        assert.that(err).is.not.null();
        assert.that(err.statusCode).is.equalTo(500);
        done();
      });
    });
  });

  test('handles parser errors gracefully.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/flaky-json'
    }, server => {
      server.stream.on('data', () => {
        // Intentionally left blank...
      });

      server.stream.once('error', err => {
        assert.that(err).is.not.null();
        done();
      });
    });
  });

  test('removes any event listeners on a parser error.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/flaky-json'
    }, server => {
      server.stream.on('data', () => {
        // Intentionally left blank...
      });

      server.stream.once('error', () => {
        process.nextTick(() => {
          assert.that(server.stream.listeners('data').length).is.equalTo(0);
          assert.that(server.stream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });

  test('sends a request body.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/echo-body',
      body: {
        foo: 'bar'
      }
    }, server => {
      server.stream.once('data', data => {
        assert.that(data).is.equalTo({
          foo: 'bar'
        });
      });

      server.stream.once('end', () => {
        done();
      });
    });
  });

  test('parses a finite stream.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/finite'
    }, server => {
      let resultCount = 0;

      server.stream.on('data', data => {
        assert.that(data.counter).is.between(0, 9);
        resultCount += 1;
      });

      server.stream.once('end', () => {
        assert.that(resultCount).is.equalTo(10);
        done();
      });
    });
  });

  test('handles large JSON objects.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/large-json'
    }, server => {
      let resultCount = 0;

      server.stream.on('data', () => {
        resultCount += 1;
      });

      server.stream.once('end', () => {
        assert.that(resultCount).is.equalTo(2);
        done();
      });
    });
  });

  test('removes any event listeners when a finite stream ends.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/finite'
    }, server => {
      server.stream.on('data', () => {
        // Intentionally left blank...
      });

      server.stream.once('end', () => {
        process.nextTick(() => {
          assert.that(server.stream.listeners('data').length).is.equalTo(0);
          assert.that(server.stream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });

  test('parses an infinite stream.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/infinite'
    }, server => {
      server.stream.on('data', data => {
        assert.that(data.counter).is.between(0, 9);
        if (data.counter === 9) {
          server.disconnect();
        }
      });

      server.stream.once('end', () => {
        done();
      });
    });
  });

  test('removes any event listeners when an infinite stream is aborted.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/infinite'
    }, server => {
      server.stream.on('data', () => {
        setTimeout(() => {
          server.disconnect();
        }, 1000);
      });

      server.stream.once('end', () => {
        process.nextTick(() => {
          assert.that(server.stream.listeners('data').length).is.equalTo(0);
          assert.that(server.stream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });

  test('sends query parameters.', done => {
    jsonLinesClient({
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
    }, server => {
      server.stream.once('data', data => {
        assert.that(data.result).is.true();
      });

      server.stream.once('end', () => {
        done();
      });
    });
  });

  test('sends custom headers.', done => {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/with-custom-headers',
      headers: {
        foo: 'bar'
      }
    }, server => {
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
    });
  });
});

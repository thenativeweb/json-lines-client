'use strict';

var http = require('http');

var assert = require('assertthat'),
    bodyParser = require('body-parser'),
    express = require('express'),
    jsonLines = require('json-lines');

var jsonLinesClient = require('../lib/jsonLinesClient');

suite('jsonLinesClient', function () {
  suiteSetup(function () {
    var app = express();

    app.use(bodyParser.json());

    app.post('/echo-body', jsonLines(function (client) {
      client.once('connect', function () {
        client.send(client.req.body);
        client.disconnect();
      });
    }));

    app.post('/with-custom-headers', function (req, res) {
      res.writeHead(200, {
        'content-type': 'application/json'
      });
      res.write(JSON.stringify(req.headers) + '\n');
      res.end();
    });

    app.post('/with-query', jsonLines(function (client) {
      var result = false;

      client.once('connect', function () {
        if (
          (client.req.query.foo === '42') &&
          (client.req.query.bar === 'baz') &&
          (client.req.query.bas.key === 'value') &&
          (client.req.query._ !== '')
        ) {
          result = true;
        }

        client.send({ result: result });
        client.disconnect();
      });
    }));

    app.post('/finite', jsonLines(function (client) {
      var counter = 0,
          timer;

      client.once('connect', function () {
        timer = setInterval(function () {
          client.send({ counter: counter++ });
          if (counter === 10) {
            clearInterval(timer);
            client.disconnect();
          }
        }, 100);
      });
    }));

    app.post('/infinite', jsonLines(function (client) {
      var counter = 0,
          timer;

      client.once('connect', function () {
        timer = setInterval(function () {
          client.send({ counter: counter++ });
        }, 100);
      });

      client.once('disconnect', function () {
        clearInterval(timer);
      });
    }));

    app.post('/flaky-json', function (req, res) {
      res.writeHead(200, {
        'content-type': 'application/json'
      });

      res.write(JSON.stringify({ foo: 'bar' }) + '\n');
      res.write(JSON.stringify({ foo: 'baz' }) + '\n');
      res.write('boom\n');
      res.write(JSON.stringify({ foo: 'bas' }) + '\n');
      res.end();
    });

    http.createServer(app).listen(3000);
  });

  test('is a function.', function (done) {
    assert.that(jsonLinesClient).is.ofType('function');
    done();
  });

  test('emits an error if the request fails.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost-xxx',
      port: 3000,
      path: '/'
    }, function (server) {
      server.stream.once('error', function (err) {
        assert.that(err).is.not.null();
        done();
      });
    });
  });

  test('emits an error if the server returns an error.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/non-existent'
    }, function (server) {
      server.stream.once('error', function (err) {
        assert.that(err).is.not.null();
        assert.that(err.name).is.equalTo('UnexpectedStatusCode');
        assert.that(err.message).is.equalTo('Cannot POST /non-existent\n');
        done();
      });
    });
  });

  test('handles parser errors gracefully.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/flaky-json'
    }, function (server) {
      server.stream.on('data', function () {
        // Intentionally left blank...
      });

      server.stream.once('error', function (err) {
        assert.that(err).is.not.null();
        assert.that(err.name).is.equalTo('InvalidJson');
        assert.that(err.message).is.equalTo('Could not parse JSON.');
        done();
      });
    });
  });

  test('removes any event listeners on a parser error.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/flaky-json'
    }, function (server) {
      server.stream.on('data', function () {
        // Intentionally left blank...
      });

      server.stream.once('error', function () {
        process.nextTick(function () {
          assert.that(server.stream.listeners('data').length).is.equalTo(0);
          assert.that(server.stream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });

  test('sends a request body.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/echo-body',
      body: {
        foo: 'bar'
      }
    }, function (server) {
      server.stream.once('data', function (data) {
        assert.that(data).is.equalTo({
          foo: 'bar'
        });
      });

      server.stream.once('end', function () {
        done();
      });
    });
  });

  test('parses a finite stream.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/finite'
    }, function (server) {
      var resultCount = 0;

      server.stream.on('data', function (data) {
        assert.that(data.counter).is.between(0, 9);
        resultCount++;
      });

      server.stream.once('end', function () {
        assert.that(resultCount).is.equalTo(10);
        done();
      });
    });
  });

  test('removes any event listeners when a finite stream ends.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/finite'
    }, function (server) {
      server.stream.on('data', function () {
        // Intentionally left blank...
      });

      server.stream.once('end', function () {
        process.nextTick(function () {
          assert.that(server.stream.listeners('data').length).is.equalTo(0);
          assert.that(server.stream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });

  test('parses an infinite stream.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/infinite'
    }, function (server) {
      server.stream.on('data', function (data) {
        assert.that(data.counter).is.between(0, 9);
        if (data.counter === 9) {
          server.disconnect();
        }
      });

      server.stream.once('end', function () {
        done();
      });
    });
  });

  test('removes any event listeners when an infinite stream is aborted.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/infinite'
    }, function (server) {
      server.stream.on('data', function () {
        setTimeout(function () {
          server.disconnect();
        }, 1000);
      });

      server.stream.once('end', function () {
        process.nextTick(function () {
          assert.that(server.stream.listeners('data').length).is.equalTo(0);
          assert.that(server.stream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });

  test('sends query parameters.', function (done) {
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
    }, function (server) {
      server.stream.once('data', function (data) {
        assert.that(data.result).is.true();
      });

      server.stream.once('end', function () {
        done();
      });
    });
  });

  test('sends custom headers.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/with-custom-headers',
      headers: {
        foo: 'bar'
      }
    }, function (server) {
      server.stream.once('data', function (data) {
        assert.that(data).is.equalTo({
          foo: 'bar',
          'content-type': 'application/json',
          host: 'localhost:3000',
          connection: 'close',
          'content-length': '0'
        });
      });

      server.stream.once('end', function () {
        done();
      });
    });
  });
});

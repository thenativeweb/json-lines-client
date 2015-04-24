'use strict';

var http = require('http');

var assert = require('assertthat'),
    express = require('express'),
    jsonLines = require('json-lines');

var jsonLinesClient = require('../lib/jsonLinesClient');

suite('jsonLinesClient', function () {
  suiteSetup(function () {
    var app = express();

    app.get('/finite', jsonLines(function (client) {
      var counter = 0,
          timer;

      client.once('open', function () {
        timer = setInterval(function () {
          client.send({ counter: counter++ });
          if (counter === 10) {
            clearInterval(timer);
            client.close();
          }
        }, 100);
      });
    }));

    app.get('/infinite', jsonLines(function (client) {
      var counter = 0,
          timer;

      client.once('open', function () {
        timer = setInterval(function () {
          client.send({ counter: counter++ });
        }, 100);
      });

      client.once('close', function () {
        clearInterval(timer);
      });
    }));

    http.createServer(app).listen(3000);
  });

  test('is a function.', function (done) {
    assert.that(jsonLinesClient).is.ofType('function');
    done();
  });

  test('parses a finite stream.', function (done) {
    jsonLinesClient({
      protocol: 'http',
      host: 'localhost',
      port: 3000,
      path: '/finite'
    }, function (finiteStream) {
      var resultCount = 0;

      finiteStream.on('data', function (data) {
        assert.that(data.counter).is.between(0, 9);
        resultCount++;
      });

      finiteStream.once('end', function () {
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
    }, function (finiteStream) {
      finiteStream.on('data', function () {
        // Intentionally left blank...
      });

      finiteStream.once('end', function () {
        process.nextTick(function () {
          assert.that(finiteStream.listeners('data').length).is.equalTo(0);
          assert.that(finiteStream.listeners('end').length).is.equalTo(0);
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
    }, function (infiniteStream) {
      infiniteStream.on('data', function (data) {
        assert.that(data.counter).is.between(0, 9);
        if (data.counter === 9) {
          infiniteStream.end();
        }
      });

      infiniteStream.once('end', function () {
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
    }, function (infiniteStream) {
      infiniteStream.on('data', function () {
        setTimeout(function () {
          infiniteStream.end();
        }, 1000);
      });

      infiniteStream.once('end', function () {
        process.nextTick(function () {
          assert.that(infiniteStream.listeners('data').length).is.equalTo(0);
          assert.that(infiniteStream.listeners('end').length).is.equalTo(0);
          done();
        });
      });
    });
  });
});

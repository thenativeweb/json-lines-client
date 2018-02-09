'use strict';

const bodyParser = require('body-parser'),
      express = require('express'),
      jsonLines = require('json-lines');

const app = express();

const getApp = function () {
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

  return app;
};

module.exports = getApp;

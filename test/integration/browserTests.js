'use strict';

/* globals window */

const http = require('http');

const assert = require('assertthat'),
      puppeteer = require('puppeteer');

const buildDistribution = require('../helpers/buildDistribution'),
      getApi = require('../helpers/getApi'),
      getFrontend = require('../helpers/getFrontend');

suite('browser tests', () => {
  let browser,
      page;

  suiteSetup(async function () {
    this.timeout(30 * 1000);

    const api = getApi();
    const frontend = getFrontend();

    http.createServer(api).listen(3000);
    http.createServer(frontend).listen(4000);

    await buildDistribution();
  });

  setup(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();

    await page.goto('http://localhost:4000/');
  });

  teardown(async () => {
    await browser.close();
  });

  suite('jsonLinesClient', () => {
    test('is a function.', async () => {
      const result = await page.evaluate(async () =>
        typeof window.jsonLinesClient);

      assert.that(result).is.equalTo('function');
    });

    test('throws an error if the server returns an error.', async () => {
      const result = await page.evaluate(async () => {
        try {
          await window.jsonLinesClient({
            protocol: 'http',
            host: 'localhost',
            port: 3000,
            path: '/non-existent'
          });
        } catch (ex) {
          return ex;
        }
      });

      assert.that(result).is.ofType('object');
      assert.that(result.code).is.equalTo('ESTATUSCODEUNEXPECTED');
    });

    test('throws an error if the server returns a status code not equal to 200.', async () => {
      const result = await page.evaluate(async () => {
        try {
          await window.jsonLinesClient({
            protocol: 'http',
            host: 'localhost',
            port: 3000,
            path: '/no-200'
          });
        } catch (ex) {
          return ex;
        }
      });

      assert.that(result).is.ofType('object');
      assert.that(result.code).is.equalTo('ESTATUSCODEUNEXPECTED');
    });

    test('handles parser errors gracefully.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
                protocol: 'http',
                host: 'localhost',
                port: 3000,
                path: '/flaky-json'
              });

              server.stream.on('data', () => {
                // Intentionally left blank...
              });

              server.stream.once('error', err => {
                resolve(err.message);
              });
            } catch (ex) {
              reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.ofType('string');
      assert.that(result).is.startingWith('Unexpected token b in JSON');
    });

    test('sends a request body.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
                protocol: 'http',
                host: 'localhost',
                port: 3000,
                path: '/echo-body',
                body: {
                  foo: 'bar'
                }
              });

              let value;

              server.stream.once('data', data => {
                value = data;
              });

              server.stream.once('end', () => {
                resolve(value);
              });
            } catch (ex) {
              return reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.equalTo({
        foo: 'bar'
      });
    });

    test('parses a finite stream.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
                protocol: 'http',
                host: 'localhost',
                port: 3000,
                path: '/finite'
              });

              const values = [];

              server.stream.on('data', data => {
                values.push(data.counter);
              });

              server.stream.once('end', () => {
                resolve(values);
              });
            } catch (ex) {
              reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.equalTo([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
    });

    test('handles large JSON objects.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
                protocol: 'http',
                host: 'localhost',
                port: 3000,
                path: '/large-json'
              });

              let value = 0;

              server.stream.on('data', () => {
                value += 1;
              });

              server.stream.once('end', () => {
                resolve(value);
              });
            } catch (ex) {
              reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.equalTo(2);
    });

    test('parses an infinite stream.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
                protocol: 'http',
                host: 'localhost',
                port: 3000,
                path: '/infinite'
              });

              const values = [];

              server.stream.on('data', data => {
                values.push(data.counter);
                if (data.counter === 9) {
                  server.disconnect();
                }
              });

              server.stream.once('end', () => {
                resolve(values);
              });
            } catch (ex) {
              reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.equalTo([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ]);
    });

    test('sends query parameters.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
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

              let value;

              server.stream.once('data', data => {
                value = data.result;
              });

              server.stream.once('end', () => {
                resolve(value);
              });
            } catch (ex) {
              reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.true();
    });

    test('sends custom headers.', async () => {
      const result = await page.evaluate(() =>
        new Promise((resolve, reject) => {
          (async () => {
            try {
              const server = await window.jsonLinesClient({
                protocol: 'http',
                host: 'localhost',
                port: 3000,
                path: '/with-custom-headers',
                headers: {
                  foo: 'bar'
                }
              });

              let value;

              server.stream.once('data', data => {
                value = data;
              });

              server.stream.once('end', () => {
                resolve(value);
              });
            } catch (ex) {
              reject(ex.message);
            }
          })();
        }));

      assert.that(result).is.ofType('object');
      assert.that(result.foo).is.equalTo('bar');
      assert.that(result['content-type']).is.equalTo('application/json');
      assert.that(result.host).is.equalTo('localhost:3000');
      assert.that(result['content-length']).is.equalTo('0');
    });
  });
});

# json-lines-client

json-lines-client makes parsing JSON lines streams a breeze.

## Installation

```shell
$ npm install json-lines-client
```

## Quick start

First you need to add a reference to json-lines-client in your application.

```javascript
const client = require('json-lines-client');
```

Then you can connect to a server that sends a JSON lines stream.

```javascript
client({
  protocol: 'http',
  host: 'localhost',
  port: 3000,
  path: '/events',
  query: {
    foo: 'bar'
  },
  headers: {
    authorization: 'Bearer ' + token
  }
}, server => {
  server.stream.on('data', data => {
    // ...
  });

  server.stream.on('end', () => {
    // ...
  });
});
```

*Please note that you can not overrid the `content-type` header in this way, as this header is being set internally by json-lines-client.*

If you want to cancel receiving a stream from the client, call the server's `disconnect` function.

```javascript
server.disconnect();
```

Either way, json-lines-client will take care of removing any event listeners from the streams created.

### Handling errors

To handle errors subscribe to the `error` event. Then you can use the error's `name` property to find out about the type of the error.

```javascript
server.stream.once('error', err => {
  // ...
});
```

If the server responded with a status code not equal to `200`, you can get the actual status code using `err.statusCode`.

### Sending a request body

From time to time you may want to send a request body along with your request, e.g. to send a configuration object to the server.

For this use the `body` property and specify an object that you want to send.

```javascript
client({
  protocol: 'http',
  host: 'localhost',
  port: 3000,
  path: '/events',
  body: {
    foo: 'bar'
  }
}, server => {
  // ...
});
```

### Using the server module

To create to a json-lines enabled server, use the [json-lines](https://www.npmjs.com/package/json-lines) module.

**Please note that json-lines-client 0.6.0 is not backwards-compatible. You must use [json-lines](https://www.npmjs.com/package/json-lines) 0.4.0 or higher.**

## Running the build

To build this module use [roboter](https://www.npmjs.com/package/roboter).

```shell
$ bot
```

## License

The MIT License (MIT)
Copyright (c) 2015-2017 the native web.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

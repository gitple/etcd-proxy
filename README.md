## etcd-proxy

Node.js service registry and discovery on top of etcd.

### Install

```
npm i etcd-proxy --save
```

### Usage

#### etcdProxy(options)

options:

- name: {String} service name for register.
- etcd: {Array} etcd hosts, eg: `['10.10.10.9:4001']`.
- ttl: {String} ttl for etcd key, default `1m`.
- prefix: {String} prefix for etcd key, default `NODE_ENV`.
- maxRetries: {Number} max retries, default `3`.
- host: {String} ip, default local ip.
- port: {Number} port, default get a random port.

#### .register() {Promise}

register a service to etcd for interval. value like:

```
{
    "hostname": "nswbmw.local",
    "address": "10.10.10.63:62822",
    "env": "test",
    "memoryUsage": { "rss": 21254144, "heapTotal": 9472608, "heapUsed": 4474536 },
    "date": "2016-03-07T10:17:46.992Z",
    "toobusy": false,
    "pid": 45717
}
```

#### .discover(name) {String}

discover service for interval and return a service url. like:

```
10.10.10.63:62822
```

### Examples

simple:

```
'use strict';

var etcdProxy = require('./')({
  etcd: ['10.10.10.9:4001'],
  name: 'api'
});

etcdProxy.register().then(function (port) {
  console.log(port);
  console.log(etcdProxy.discover('api'));
});
```

used with koa:

```
'use strict';

var app = require('koa')();
var router = require('koa-router')();
var etcdProxy = require('./')({
  etcd: ['10.10.10.9:4001'],
  name: 'api'
});

etcdProxy.register().then(function (port) {
  app.listen(port, function () {
    console.log('listening on port %s', port);
  });
});

app.use(router.routes());

router.get('/', function* () {
  this.body = etcdProxy.discover('api');
});
```

### License

MIT

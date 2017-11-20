## etcd-proxy

Node.js service registry and discovery on top of [etcd](https://github.com/coreos/etcd).

### Install

```sh
$ npm i etcd-proxy --save
```

### Usage

#### etcdProxy(options)

options:

- name: {String} service name for register.
- hosts: {String|Array} etcd hosts, eg: `['10.10.10.9:4001']`.
- ttl: {Number} time to live in seconds for etcd key, default `5`.
- prefix: {String} prefix for etcd key, default `''`.
- maxRetries: {Number} max retries, default `3`.
- host: {String} ip, default local ip.
- port: {Number} port, default get a random port.

#### .register() {Promise}

register address to etcd for interval. value like:

```
127.0.0.1:9000
```

#### .discover(name) {Promise}

discover service for interval and return a service url. like:

```
127.0.0.1:9000
```

### Example

```js
const Koa = require('koa')
const etcdProxy = require('etcd-proxy')({
  hosts: ['localhost:2379'],
  name: 'api'
})
const app = new Koa()

app.use(async (ctx) => {
  ctx.body = await etcdProxy.discover('api')
})

etcdProxy.register().then((port) => {
  app.listen(port, () => {
    console.log(`listening on port ${port}`)
  })
})
```

### License

MIT

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
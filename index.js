'use strict';

var os = require('os');
var ms = require('ms');
var ip = require('ip');
var Etcd = require('node-etcd');
var toobusy = require('toobusy-js');

module.exports = function etcdProxy(opts) {
  if (!opts.etcd) {
    throw new TypeError('No etcd url.');
  }
  var name = opts.name;
  var etcd = Array.isArray(opts.etcd) ? new Etcd(opts.etcd) : new Etcd([opts.etcd]);
  var ttl = Math.floor(ms(opts.ttl || '1m') / 1000);
  var prefix = (opts.prefix || process.env.NODE_ENV);
  if (!prefix) {
    throw new TypeError('No prefix.');
  }
  prefix = prefix[0] === '/' ? prefix : '/' + prefix;
  var maxRetries = opts.maxRetries || 3;
  var host = opts.host || ip.address();
  var port = opts.port;
  var _getPort;

  var setTimer; 
  var config = {};
  var watchers = {};

  return {
    register: function() {
      if (!name) {
        throw new TypeError('No service name.');
      }
      if (!setTimer) {
        setTimer = setInterval(function () {
          register();
        }, ttl * 1000);
      }
      return register();
    },
    discover: function(name) {
      if (!name) {
        throw new TypeError('No service name.');
      }
      if (!watchers[name]) {
        watchers[name] = etcd.watcher(genGetKey());
        watchers[name].on('change', function () {
          config[name] = discover(name);
        });
      }
      if (!config[name]) {
        config[name] = discover(name);
      }
      var urls = config[name] || [];
      // return random url
      return urls[Math.floor(Math.random() * urls.length)];
    }
  };

  function getPort() {
    if (port) {
      return Promise.resolve(port);
    }
    if (!_getPort) {
      _getPort = require('get-port')().then(function (_port) {
        port = _port;
        return port;
      });
    }
    return _getPort;
  }

  function genSetKey() {
    return prefix + '/' + name + '/' + host + ':' + port;
  }

  function register() {
    return getPort()
      .then(function () {
        return new Promise(function (resolve, reject) {
          etcd.set(genSetKey(), JSON.stringify({
            hostname: os.hostname(),
            address: host + ':' + port,
            env: process.env.NODE_ENV,
            memoryUsage: process.memoryUsage(),
            date: new Date(),
            toobusy: toobusy(),
            pid: process.pid
          }), {
            ttl: ttl * 2,
            maxRetries: maxRetries
          }, function (err) {
            if (err) return reject(err);
            resolve(port);
          });
        });
      });
  }

  function genGetKey() {
    return prefix + '/' + name;
  }

  function discover(name, _index) {
    _index = _index || 0;
    var res = etcd.getSync(genGetKey(), { recursive: true });
    if (res.err) {
      console.error(res.err);
      if (_index < maxRetries) {
        return discover(name, ++_index);
      }
      return [];
    }
    var nodes = res.body.node.nodes || [];
    if (!nodes.length) {
      if (_index < maxRetries) {
        return discover(name, ++_index);
      }
      console.error('No available services.');
    }
    config[name] = nodes.map(function (node) {
      return JSON.parse(node.value).address;
    });
    return config[name];
  }

  process.on('exit', function () {
    if (port) {
      etcd.delSync(genSetKey());
    }
  });
};

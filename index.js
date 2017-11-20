const ip = require('ip')
const Etcd = require('node-etcd')
const getPort = require('get-port')

module.exports = function etcdProxy (opts) {
  opts = opts || {}
  if (!opts.hosts) {
    throw new TypeError('No etcd url.')
  }
  const name = opts.name
  const etcd = new Etcd(opts.hosts)
  const ttl = opts.ttl || 5
  let prefix = opts.prefix || ''
  if (prefix) {
    prefix = prefix[0] === '/' ? prefix : `/${prefix}`
  }
  const maxRetries = opts.maxRetries || 3
  const host = opts.host || ip.address()
  let port = opts.port

  let timer
  const serviceLists = {}
  const serviceWatchers = {}

  process.on('exit', () => {
    if (port) {
      etcd.delSync(genSetKey())
    }
  })

  return {
    register: async function () {
      if (!name) {
        throw new TypeError('No register service name.')
      }
      if (!timer) {
        timer = setInterval(register, ttl * 1000)
      }
      return register()
    },
    discover: async function (name) {
      if (!name) {
        throw new TypeError('No discover service name.')
      }
      if (!serviceWatchers[name]) {
        serviceWatchers[name] = etcd.watcher(genGetKey())
        serviceWatchers[name].on('change', () => {
          discover(name).then(address => {
            serviceLists[name] = address
          })
        })
      }
      if (!serviceLists[name]) {
        serviceLists[name] = await discover(name)
      }
      const urls = serviceLists[name] || []
      // return random url
      return urls[Math.floor(Math.random() * urls.length)]
    }
  }

  function _getPort () {
    if (port) {
      return Promise.resolve(port)
    }
    return getPort().then((_port) => {
      port = _port
      return port
    })
  }

  function genSetKey () {
    return `${prefix}/${name}/${host}:${port}`
  }

  function register () {
    return _getPort().then(() => {
      return new Promise((resolve, reject) => {
        etcd.set(
          genSetKey(),
          `${host}:${port}`,
          { ttl, maxRetries },
          (err) => {
            if (err) return reject(err)
            resolve(port)
          }
        )
      })
    })
  }

  function genGetKey () {
    return `${prefix}/${name}`
  }

  function discover (name, _retryTime) {
    _retryTime = _retryTime || 0
    return new Promise((resolve, reject) => {
      etcd.get(genGetKey(), { recursive: true }, (err, res) => {
        if (err) {
          console.error(err)
          if (_retryTime < maxRetries) {
            return resolve(discover(name, ++_retryTime))
          }
          return resolve([])
        }
        const nodes = res.node.nodes || []
        if (!nodes.length) {
          if (_retryTime < maxRetries) {
            return resolve(discover(name, ++_retryTime))
          }
          console.error(`No available '${name}' serviceLists.`)
        }
        serviceLists[name] = nodes.map((node) => {
          return node.value
        })
        return resolve(serviceLists[name])
      })
    })
  }
}

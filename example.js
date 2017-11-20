const Koa = require('koa')
const etcdProxy = require('./')({
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

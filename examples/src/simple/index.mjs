// import "./routes.mjs"
import http from 'http'
import { container, router } from "./services.mjs"
import middleware from "./middleware/**/*Middleware.mjs"
import controllers from "./controllers/**/*Controller.mjs"

const services = [ ...middleware, ...controllers ]
  .reduce((prev, curr) => {
    return prev.concat(Object.values(curr).filter(v => (v.metadata ?? {}).type === 'service'))
  }, [])


container.discovering(services)
console.log('Binding values:', container.bindings.size);

http
  .createServer(async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Accept': 'application/json' })
    res.end(JSON.stringify({ name: "Mr Stone" }))
  })
  .listen(
    4200,
    'localhost',
    () => console.log('Server started at:', 'http://localhost:4200')
  )

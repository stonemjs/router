// import "./routes.mjs"
import http from 'http'
import { container, router } from "./services.mjs"
import middleware from "./middleware/**/*Middleware.mjs"
import controllers from "./controllers/**/*Controller.mjs"
import { RouteDefinition, RequestContext } from "@noowow-community/router"
import { AuthMiddleware } from './middleware/AuthMiddleware.mjs'
import { UserController } from './controllers/UserController.mjs'

const services = [ ...middleware, ...controllers ]
  .reduce((prev, curr) => {
    return prev.concat(Object.values(curr).filter(v => (v.metadata ?? {}).type === 'service'))
  }, [])


// Bind services
container.discovering(services)

// Routes
const routeDefinition = new RouteDefinition({
  uri: '/users/me',
  name: 'user.me',
  // domain: 'localhost',
  middleware: [AuthMiddleware],
  action: [UserController, 'showMe']
})

router.addRoute(routeDefinition)
console.log('Route size', router.getRoutes().size);
console.table(router.dumpRoutes())

http
  .createServer(async (req, res) => {
    const request  = await RequestContext.fromNodeRequest(req, { httpPort: 4200 })
    const response = await router.dispatch(request)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Accept': 'application/json' })
    res.end(JSON.stringify({ name: "Mr Stone" }))
  })
  .listen(
    4200,
    'localhost',
    () => console.log('Server started at:', 'http://localhost:4200')
  )

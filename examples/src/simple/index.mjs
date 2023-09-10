import "./routes.mjs"
import http from 'http'
import { container, router } from "./services.mjs"
import { RouteDefinition, RequestContext } from "@noowow-community/router"
import { AuthMiddleware } from './middleware/AuthMiddleware.mjs'
import { UserController } from './controllers/UserController.mjs'

// Routes
const routeDefinition = new RouteDefinition({
  uri: '/users/me',
  name: 'user.me',
  // domain: 'localhost',
  middleware: [AuthMiddleware],
  action: [UserController, 'showMe']
})

router.addRoute(routeDefinition)

// Log route infos
const dumpRoutes = router.dumpRoutes()
console.log('Routes count', dumpRoutes.length)
console.table(dumpRoutes)

http
  .createServer(async (req, res) => {
    const request  = await RequestContext.fromNodeRequest(req, { httpPort: 4200 })
    container.instance('request', request)
    const response = await router.dispatch(request)
    res.writeHead(response.statusCode, response.headers)
    res.end(JSON.stringify(response.content))
  })
  .listen(
    4200,
    'localhost',
    () => console.log('Server started at:', 'http://localhost:4200')
  )

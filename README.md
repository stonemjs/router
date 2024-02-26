# Stone.js universal Router
Vanilla Javascript Backend and frontend Router with proposal decorator


# Todo
## Request
The current request object

## Route
The resolved route

## RouteCollection
The predifined list routes

## Controller Dispatcher
To dispatch the current route to controller and check middleware

## Event
RouteMatched

## Loaders
Loaders allow to load route definition and mount the router with routes.
To load routes from app
Type of loaders
1. ControllerLoader, from decorators. Controllers could be in modules, directory, file, globfile
2. DefinitionLoader, from single file. Could be in file, object
3. Container loader, from service container

## Matcher
To match request to route
Type of matcher
1. UrlMatcher
2. RequestMatcher
3. SchemeMatcher
4. MethdMatcher
5. HostMatcher

## Generator
To generate url base on a given value
1. UrlGenerator

## Exception
1. RuntimeException
2. RouteNotFoundException
3. ResourceNotFoundException
4. NoConfigurationException
5. MissingMandatoryParametersException
6. MethodNotAllowedException
7. InvalidParameterException
8. InvalidArgumentException

## Decorator
1. Route
2. Get
3. Post
4. Put
5. Patch
6. Delete
7. Options
8. Controller
9. Match
10. Any


# Routes
`
  {
    name: 'user',
    uri: '/users/:id? | /users/{id?}',
    rules: { id: '\d+' },
    domain: '{domain}.example.com',
    method: 'GET',
    methods: [],
    policies: [],
    validators: [],
    middleware: [],
    children: [
      {}
    ],
    defaults: { id: 12 }
    fallback: true,
    action: ({ request, container, params }) => {

    }
  }
`


Route to do:
1. Check match path with pattern
2. Get current route
3. Get pattern regex
4. Get path params (RouteParameterBinding object to retrieve the params)
5. Execute query and return response (check if action is callable or controller)
6. Add route in cache and call them instead of creating one
7. ControllerDispatcher
8. CallableDispatcher



Router deps
1. Noowow Service container


Router parametrable features
1. Callable dispatcher
2. Controller dispatcher
3. Service Container



to do:
1. Router
2. RouteUrlGenerator
3. Router loader (RouteDefinitionLoader, RouteDecoratorLoader)



## Route use case
const route  = new Route({
  name: 'users',
  domain: ':section.example.com',
  uri: '/users/:id?',
  rules: { id: '\d+' }
  methods: ['GET', 'POST'],
  middleware: [AuthMiddleware],
  action: ({ request, params, container }) => {
    return request.query.name
  }
})

@Get({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})
@Post({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})
@Put({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})
@Patch({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})
@Delete({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})
@Options({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})
@Match({
  uri: '/users/:id?',
  methods: ['GET', 'POST'],
  middleware: [AuthMiddleware]
})
@Any({
  uri: '/users/:id?',
  middleware: [AuthMiddleware]
})





## Param name regex
`
const regex = (type = 'default', value = '\\w+', flag = 'gi') => {
  return {
    required: new RegExp(`\/(:(${value})|\\{(${value})\\})\/`, flag),
    optional: new RegExp(`\/(:(${value})\\?|\\{(${value})\\?\\})\/`, flag),
    default: new RegExp(`\/(:(${value})\\??|\\{(${value})\\??\\})`, flag)
  }[type]
}

const uri = '/articles/:id/comments/{id2}/:patate?/{banane}/{avocat?}/'

const getNames = (regex, value) => {
  let matchers
  const names = []

  while ((matchers = regex.exec(value)) !== null) {
    matchers[0] && names.push(matchers[0].replace(/:|\{|\}|\?|\//gm, ''))
  }

  return names
}

console.log(regex(), regex().test(uri), getNames(regex(), uri))
console.log(regex('optional'), regex('optional').test(uri), getNames(regex('optional'), uri))
console.log(regex('required'), regex('required').test(uri), getNames(regex('required'), uri))

`

# Route raw definition
`
  {
  uri: '/users',
  name: 'users',
  middleware: ['User'],
  action: LogicException,
  rules: { id: '\d+' },
  children: [
    {
      method: 'GET',
      children: [
        {
          uri: '/',
          name: 'list',
          action: 'list'
        },
        {
          uri: '/:id',
          name: 'show',
          action: 'show',
        }
      ]
    },
    {
      uri: '/',
      name: 'post',
      method: 'POST',
      action: 'create'
    },
    {
      uri: '/:id',
      children: [
        {
          name: 'update',
          method: 'PUT',
          action: 'update',
        },
        {
          name: 'delete',
          method: 'DELETE',
          action: [RouteDefinition, 'remove'],
        }
      ]
    }
  ]
}
`


# Controller
Should pass an application context to controller

# Route definitions example
`
{
  path: '/comments/:id', // required params
  path: '/comments/:id?', // optional params
  path: '/comments/list-or-show/:id(\\d+)', // With regex rule
  path: '/users/:id/comments',
  path: '/users/:id/comments/name-:nameSuffix(.*)', // Param suffix name with regex
  path: '/:chapters+', // Repeatable params
  path: '/:chapters*', // Repeatable params
  path: '/:chapters(\\d+)+', // Repeatable params with regex
  path: '/:chapters(\\d+)*', // Repeatable params with regex
  path: '/posts/:post@slug(\\d+)', // Model binding field to resolve the model in db
  method: 'GET',
  throttle: [LoginRateLimiter], // Allow to define rate limiter for route
  methods: ['GET'],
  children: [], // If parent has
  domain: 'domain',
  fallback: true,
  defaults: { post: null },
  name: 'comment.list',
  bindings: {
    post: ArticlePost
  },
  middleware: [AuthMiddleware],
  action: { listOrShow: CommentController },
  actions: { default: HomeView, left: LeftView }, // Multiple render
  rules: { id: /\d+/ },
  redirect: '/items', // redirect to this route, { name: 'itemsView' }, (request) => ({ path: '/items', query: { it: request.params.item } })
  redirect: 'items', // relative redirect
  alias: '',
  validators: [] // Custom route definition, defined by third party library to allow validatig request query and body
}
`
## Path
The path to match the user request and dispatch to controller

## Rules
Define regex for path params definition

## Bindings (Implicit)
Allow to resolve a model from the database, model must contains methods like, `getTableName`, `findOneBy`, `resolveRouteBinding`.
Model can defined methods like: `getRouteKeyName`

## Children
Group routes or call many routes in frontend context.

If parent has action and children at the same time(only for frontend), 
create routes for both parent and children and resolve all routes and return value for all.

If parent hasn't no action combine parent and children routes and select one route that matches the request.

## Defaults
Define default route params values: `{ post: null }`

## Alias
Allow to create an alias for routes, so for an alias `profile` to the internal route `user` request can be `user` or `profile`

## Redirect
Allow to redirect request from one route to another route

# Throttle
Allow to defined rate limiter for routes
`
class LoginRateLimiter {
  handle (request) {
    return Limit.perMinute(100)
  }
}
`

## Metadata
It internal route props that allow adding custom props to route definition, ex: `validators` to validate request body and query


segments
# Router
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
To load routes from app
Type of loaders
1. Modules loader
2. Decorator loader
3. Directory loader
4. File loader
5. GlobFile loader
6. Object loader
7. Container loader

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
const regex = (type = 'default', value = '\\w+', flag = 'gm') => {
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
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
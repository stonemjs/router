export class MethodMatcher {
  matches (route, requestContext) {
    return route.getMethods().includes(requestContext.method)
  }
}
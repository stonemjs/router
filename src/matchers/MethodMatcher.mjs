export class MethodMatcher {
  matches (route, request) {
    return route.getMethods().includes(request.method)
  }
}
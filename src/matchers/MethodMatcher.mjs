export class MethodMatcher {
  matches (route, request) {
    return route.methods.includes(request.method)
  }
}

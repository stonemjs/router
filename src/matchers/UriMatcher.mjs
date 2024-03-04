export class UriMatcher {
  matches (route, request) {
    return route.uriRegex().test(request.decodedPath)
  }
}

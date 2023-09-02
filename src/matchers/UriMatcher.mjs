export class UriMatcher {
  matches (route, request) {
    return RegExp(`^${route.getPathRegex()}$`, 'g').test(request.pathInfo)
  }
}
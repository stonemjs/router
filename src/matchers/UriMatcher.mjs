export class UriMatcher {
  matches (route, requestContext) {
    return route.uriRegex().test(requestContext.decodedPath)
  }
}

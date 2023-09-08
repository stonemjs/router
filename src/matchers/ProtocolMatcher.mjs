export class ProtocolMatcher {
  matches (route, requestContext) {
    if (route.isHttpOnly()) {
      return !requestContext.isSecure
    } else if (requestContext.isSecure) {
      return requestContext.isSecure
    } else {
      return true
    }
  }
}

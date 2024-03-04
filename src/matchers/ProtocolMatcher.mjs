export class ProtocolMatcher {
  matches (route, request) {
    if (route.isHttpOnly()) {
      return !request.isSecure
    } else if (request.isSecure) {
      return request.isSecure
    } else {
      return true
    }
  }
}

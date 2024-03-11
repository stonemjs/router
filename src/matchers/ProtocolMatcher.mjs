export class ProtocolMatcher {
  matches (route, request) {
    if (route.isHttpOnly()) {
      return request.isSecure === false
    } else if (route.isHttpsOnly()) {
      return request.isSecure === true
    } else {
      return true
    }
  }
}

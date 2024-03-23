/**
 * Class representing a ProtocolMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class ProtocolMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {external:Request} request
   * @return {boolean}
   */
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

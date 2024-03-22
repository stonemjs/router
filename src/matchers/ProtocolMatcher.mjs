/**
 * Class representing a ProtocolMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @typedef {import('../Route.mjs').Route} Route
 *
 * @external Request
 * @see {@link https://github.com/stonemjs/http/blob/main/src/Request.mjs|Request}
 */
export class ProtocolMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {Request} request
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

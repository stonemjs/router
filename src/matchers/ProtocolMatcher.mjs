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
   * @param  {IncomingEvent} event
   * @return {boolean}
   */
  matches (route, event) {
    if (route.isHttpOnly()) {
      return event.isSecure === false
    } else if (route.isHttpsOnly()) {
      return event.isSecure === true
    } else {
      return true
    }
  }
}

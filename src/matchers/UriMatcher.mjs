/**
 * Class representing an UriMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class UriMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {IncomingEvent} event
   * @return {boolean}
   */
  matches (route, event) {
    return route.pathRegex().reduce((prev, curr) => prev || curr.test(event.decodedPathname), false)
  }
}

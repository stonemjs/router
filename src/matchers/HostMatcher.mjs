/**
 * Class representing an HostMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class HostMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {IncomingEvent} event
   * @return {boolean}
   */
  matches (route, event) {
    return !route.domainRegex() || route.domainRegex().test(event.host)
  }
}

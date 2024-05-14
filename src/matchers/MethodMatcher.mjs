/**
 * Class representing a MethodMatcher.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 */
export class MethodMatcher {
  /**
   * matches.
   *
   * @param  {Route}   route
   * @param  {IncomingEvent} event
   * @return {boolean}
   */
  matches (route, event) {
    return route.methods.includes(event.method)
  }
}

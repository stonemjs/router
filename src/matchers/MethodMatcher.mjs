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
   * @param  {external:Request} request
   * @return {boolean}
   */
  matches (route, request) {
    return route.methods.includes(request.method)
  }
}

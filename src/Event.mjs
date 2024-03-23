import { AbstractEvent } from '@stone-js/common'
/**
 * AbstractEvent
 *
 * @external AbstractEvent
 * @see {@link https://github.com/stonemjs/common/blob/main/src/AbstractEvent.mjs|AbstractEvent}
*/

/**
 * Class representing a Route Event.
 *
 * @author Mr. Stone <evensstone@gmail.com>
 *
 * @extends external:AbstractEvent
 */
export class Event extends AbstractEvent {
  /**
   * ROUTING Event name, fires before request match route.
   *
   * @type {string}
   * @event Event#ROUTING
   */
  static ROUTING = 'stonejs@router.routing'

  /**
   * ROUTE_MATCHED Event name, fires after request matched route.
   *
   * @type {string}
   * @event Event#ROUTE_MATCHED
   */
  static ROUTE_MATCHED = 'stonejs@router.route_matched'
}

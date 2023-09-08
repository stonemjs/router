export default class EventManager {
  constructor () {
    this.listeners = []
  }

  static getInstance () {
    return new this()
  }

  static get shared () {
    if (!this.singleton) {
      this.singleton = this.getInstance()
    }
    return this.singleton
  }

  subscribe (eventType, callback) {
    return this.listeners.push({ eventType, callback }) - 1
  }

  unsubscribe (subscriptionId) {
    this.listeners = this.listeners.filter((_, i) => i !== subscriptionId)
  }

  notify (eventType, data) {
    this.listeners
      .filter(v => v.eventType === eventType)
      .forEach(v => v.callback(data))
  }
}

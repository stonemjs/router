import { RouteOptions } from './Route'
import { RouteSegmentConstraint } from './declarations'

const pathConstraintRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)(?:=(.+?))?\}?$/
const domainConstraintRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)(?:=(.+?))?\})?(.+)$/

export const uriRegex = (options: RouteOptions, flags: string = 'i'): RegExp => {
  flags = options.strict === true ? '' : flags
  const trailingSlash = options.strict === true ? (options.path.endsWith('/') ? '/' : '') : '/?'
  const domain = options.domain !== undefined ? buildDomainPattern(getDomainConstraints(options)) : ''
  const path = getSegmentsConstraints(options).reduce((prev, curr) => `${prev}${buildSegmentPattern(curr)}`, '')
  return new RegExp(`^${domain}${path.length > 0 ? path : '/'}${trailingSlash}$`, flags)
}

export const pathRegex = (options: RouteOptions, flags: string = 'i'): RegExp => {
  flags = options.strict === true ? '' : flags
  const trailingSlash = options.strict === true ? (options.path.endsWith('/') ? '/' : '') : '/?'
  const pattern = getSegmentsConstraints(options).reduce((prev, curr) => `${prev}${buildSegmentPattern(curr)}`, '')
  return new RegExp(`^${pattern.length > 0 ? pattern : '/'}${trailingSlash}$`, flags)
}

export const domainRegex = (options: RouteOptions, flags: string = 'i'): RegExp | undefined => {
  flags = options.strict === true ? '' : flags
  const pattern = options.domain ? buildDomainPattern(getDomainConstraints(options)) : undefined
  return pattern ? new RegExp(`^${pattern}$`, flags) : undefined
}

export const buildDomainPattern = (constraint?: Partial<RouteSegmentConstraint>): string | undefined => {
  if (constraint?.param === undefined) { return constraint?.suffix }
  return constraint.optional
    ? `(${constraint.rule})?${constraint.suffix}`
    : `(${constraint.rule})${constraint.suffix}`
}

export const buildSegmentPattern = (constraint?: Partial<RouteSegmentConstraint>): string => {
  if (constraint === undefined) {
    return '/'
  } else if (constraint.param === undefined) {
    return `/${constraint.match}`
  } else if (constraint.prefix !== undefined) {
    switch (constraint.quantifier) {
      case '?':
        return `/${constraint.prefix}(${constraint.rule})?`
      case '+':
        return `/${constraint.prefix}((?:${constraint.rule})(?:/(?:${constraint.rule}))*)`
      case '*':
        return `/${constraint.prefix}((?:${constraint.rule})(?:/(?:${constraint.rule}))*)?`
      default:
        return `/${constraint.prefix}(${constraint.rule})`
    }
  } else {
    switch (constraint.quantifier) {
      case '?':
        return `(?:/(${constraint.rule}))?`
      case '+':
        return `/((?:${constraint.rule})(?:/(?:${constraint.rule}))*)`
      case '*':
        return `(?:/((?:${constraint.rule})(?:/(?:${constraint.rule}))*))?`
      default:
        return `/(${constraint.rule})`
    }
  }
}

export const uriConstraints = (options: RouteOptions): Array<Partial<RouteSegmentConstraint>> => {
  return [getDomainConstraints(options), getSegmentsConstraints(options)].flat().filter(v => v !== undefined)
}

export const getDomainConstraints = (options: RouteOptions): Partial<RouteSegmentConstraint> | undefined => {
  let domainConstraints: Partial<RouteSegmentConstraint> | undefined

  if (options.domain !== undefined) {
    const keys = ['match', 'param', 'alias', 'rule', 'quantifier', 'default', 'suffix']

    domainConstraints ??= options
      .domain
      .match(domainConstraintRegex)
      ?.filter((_, i) => i < keys.length)
      .reduce<Partial<RouteSegmentConstraint>>((prev, curr, i) => ({ ...prev, [keys[i]]: curr }), {})

    if (domainConstraints?.param !== undefined) {
      domainConstraints.rule ??= options.rules?.[domainConstraints.param]
      domainConstraints.default ??= options.defaults?.[domainConstraints.param]
      domainConstraints.optional = /^[?*]$/.test(domainConstraints.quantifier ?? '')
    }
  }

  return domainConstraints
}

export const getSegmentsConstraints = (options: RouteOptions): Array<Partial<RouteSegmentConstraint>> => {
  return options
    .path
    .split('/')
    .filter(segment => segment.trim().length > 0)
    .map((segment): Partial<RouteSegmentConstraint> => {
      if (/[:}]/.test(segment)) {
        const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier', 'default']
        return segment
          .match(pathConstraintRegex)
          ?.filter((_, i) => i < keys.length)
          ?.reduce((prev, curr, i) => ({ ...prev, [keys[i]]: curr }), {}) ?? {}
      } else {
        return { match: segment }
      }
    })
    .map((segment) => {
      if (segment?.param !== undefined) {
        segment.rule ??= options.rules?.[segment.param]
        segment.default ??= options.defaults?.[segment.param]
        segment.optional = /^[?*]$/.test(segment.quantifier ?? '')
      }
      return segment
    })
}

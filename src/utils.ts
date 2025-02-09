import { EventHandlerType, FactoryEventHandler, IIncomingEvent, IOutgoingResponse, MetaEventHandler, RegexPatternOptions, RouteSegmentConstraint } from './declarations'

/**
 * Defines a route handler with metadata for the provided handler function.
 * This function allows users to define a route handler with metadata.
 *
 * @param module - The module handler function to be defined.
 * @param options - The metadata options for the handler.
 * @returns The defined route handler with metadata.
 */
export const defineHandler = <U extends IIncomingEvent = IIncomingEvent, V = IOutgoingResponse>(
  module: EventHandlerType<U, V>,
  options: Omit<MetaEventHandler<U, V>, 'module'> = {}
): MetaEventHandler<U, V> => {
  return { ...options, module }
}

/**
 * Defines a factory handler with metadata for the provided handler function.
 * This function allows users to define a factory handler with metadata.
 *
 * @param module - The module handler function to be defined.
 * @returns The defined factory handler with metadata.
*/
export const factoryHandler = <U extends IIncomingEvent = IIncomingEvent, V = IOutgoingResponse>(
  module: FactoryEventHandler<U, V>
): MetaEventHandler<U, V> => {
  return { module, isFactory: true }
}

/**
 * Check if the provided value is a meta Component module.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a meta Component module, otherwise `false`.
*/
export const isMetaComponentModule = <ComponentModuleType>(value: any): value is Record<'module', ComponentModuleType> => {
  return value?.isComponent === true
}

/**
 * Regular expression for extracting path constraints from route segments.
 */
const pathConstraintRegex = /^(.+?)?[:{](.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)(?:=(.+?))?\}?$/

/**
 * Regular expression for extracting domain constraints from route options.
 */
const domainConstraintRegex = /^(?:\{(.+?)(?:@(.+?))?(?:\((.+?)\))?([?*+]?)(?:=(.+?))?\})?(.+)$/

/**
 * Builds a regular expression for matching a full URI based on route options.
 *
 * @param options - The route options to build the regex from.
 * @param flags - Regular expression flags, defaults to 'i' (case insensitive).
 * @returns A regular expression for matching URIs.
 *
 * @example
 * ```typescript
 * const regex = uriRegex({ path: '/users/:id', strict: false });
 * console.log(regex.test('/users/123')); // true
 * ```
 */
export const uriRegex = (options: RegexPatternOptions, flags: string = 'i'): RegExp => {
  flags = options.strict === true ? '' : flags
  const domain = buildDomainPattern(getDomainConstraints(options)) ?? ''
  const trailingSlash = options.strict === true ? (options.path.endsWith('/') ? '/' : '') : '/?'
  const path = getSegmentsConstraints(options).reduce((prev, curr) => `${prev}${buildSegmentPattern(curr)}`, '')
  return new RegExp(`^${domain}${path}${trailingSlash}$`, flags)
}

/**
 * Builds a regular expression for matching route paths based on route options.
 *
 * @param options - The route options to build the regex from.
 * @param flags - Regular expression flags, defaults to 'i' (case insensitive).
 * @returns A regular expression for matching route paths.
 *
 * @example
 * ```typescript
 * const regex = pathRegex({ path: '/users/:id', strict: false });
 * console.log(regex.test('/users/123')); // true
 * ```
 */
export const pathRegex = (options: RegexPatternOptions, flags: string = 'i'): RegExp => {
  flags = options.strict === true ? '' : flags
  const trailingSlash = options.strict === true ? (options.path.endsWith('/') ? '/' : '') : '/?'
  const pattern = getSegmentsConstraints(options).reduce((prev, curr) => `${prev}${buildSegmentPattern(curr)}`, '')
  return new RegExp(`^${pattern}${trailingSlash}$`, flags)
}

/**
 * Builds a regular expression for matching domains based on route options.
 *
 * @param options - The route options to build the regex from.
 * @param flags - Regular expression flags, defaults to 'i' (case insensitive).
 * @returns A regular expression for matching domains or undefined if no domain is specified.
 *
 * @example
 * ```typescript
 * const regex = domainRegex({ domain: '{subdomain}.example.com' });
 * console.log(regex?.test('api.example.com')); // true
 * ```
 */
export const domainRegex = (options: RegexPatternOptions, flags: string = 'i'): RegExp | undefined => {
  flags = options.strict === true ? '' : flags
  const pattern = options.domain !== undefined ? buildDomainPattern(getDomainConstraints(options)) : undefined
  return pattern !== undefined ? new RegExp(`^${pattern}$`, flags) : undefined
}

/**
 * Builds a domain pattern based on a route segment constraint.
 *
 * @param constraint - Partial route segment constraint for domain matching.
 * @returns A string representing the domain pattern or undefined.
 */
export const buildDomainPattern = (constraint?: Partial<RouteSegmentConstraint>): string | undefined => {
  if (constraint?.param === undefined) {
    return constraint?.suffix
  }
  return constraint.optional === true
    ? `(${stringifyRegex(constraint.rule)})?${String(constraint.suffix)}`
    : `(${stringifyRegex(constraint.rule)})${String(constraint.suffix)}`
}

/**
 * Builds a path segment pattern based on a route segment constraint.
 *
 * @param constraint - Partial route segment constraint for path matching.
 * @returns A string representing the path pattern.
 */
export const buildSegmentPattern = (constraint?: Partial<RouteSegmentConstraint>): string => {
  if (constraint === undefined) {
    return '/'
  } else if (constraint.param === undefined) {
    return `/${String(constraint.match)}`
  } else if (constraint.prefix !== undefined) {
    switch (constraint.quantifier) {
      case '?':
        return `/${String(constraint.prefix)}(${stringifyRegex(constraint.rule)})?`
      case '+':
        return `/${String(constraint.prefix)}((?:${stringifyRegex(constraint.rule)})(?:/(?:${stringifyRegex(constraint.rule)}))*)`
      case '*':
        return `/${String(constraint.prefix)}((?:${stringifyRegex(constraint.rule)})(?:/(?:${stringifyRegex(constraint.rule)}))*)?`
      default:
        return `/${String(constraint.prefix)}(${stringifyRegex(constraint.rule)})`
    }
  } else {
    switch (constraint.quantifier) {
      case '?':
        return `(?:/(${stringifyRegex(constraint.rule)}))?`
      case '+':
        return `/((?:${stringifyRegex(constraint.rule)})(?:/(?:${stringifyRegex(constraint.rule)}))*)`
      case '*':
        return `(?:/((?:${stringifyRegex(constraint.rule)})(?:/(?:${stringifyRegex(constraint.rule)}))*))?`
      default:
        return `/(${stringifyRegex(constraint.rule)})`
    }
  }
}

/**
 * Generates an array of URI constraints based on route options.
 *
 * @param options - The route options to extract constraints from.
 * @returns An array of partial route segment constraints.
 */
export const uriConstraints = (options: RegexPatternOptions): Array<Partial<RouteSegmentConstraint>> => {
  return [getDomainConstraints(options), getSegmentsConstraints(options)].flat().filter(v => v !== undefined)
}

/**
 * Extracts domain constraints from route options.
 *
 * @param options - The route options to extract domain constraints from.
 * @returns Partial route segment constraint for the domain or undefined.
 */
export const getDomainConstraints = (options: RegexPatternOptions): Partial<RouteSegmentConstraint> | undefined => {
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
      domainConstraints.optional = /^[?*]$/.test(String(domainConstraints.quantifier))
    }
  }

  return domainConstraints
}

/**
 * Extracts path segment constraints from route options.
 *
 * @param options - The route options to extract constraints from.
 * @returns An array of partial segment constraints for the path.
 */
export const getSegmentsConstraints = (options: RegexPatternOptions): Array<Partial<RouteSegmentConstraint>> => {
  return options
    .path
    .split('/')
    .filter(segment => segment.trim().length > 0)
    .map((segment): Partial<RouteSegmentConstraint> | undefined => {
      if (/[:}]/.test(segment)) {
        const keys = ['match', 'prefix', 'param', 'alias', 'rule', 'quantifier', 'default']
        return segment
          .match(pathConstraintRegex)
          ?.filter((_, i) => i < keys.length)
          ?.reduce((prev, curr, i) => ({ ...prev, [keys[i]]: curr }), {})
      } else {
        return { match: segment }
      }
    })
    .filter(segment => segment !== undefined)
    .map((segment) => {
      if (segment?.param !== undefined) {
        segment.rule ??= options.rules?.[segment.param]
        segment.default ??= options.defaults?.[segment.param]
        segment.optional = /^[?*]$/.test(String(segment.quantifier))
      }
      return segment
    })
}

const stringifyRegex = (pattern?: string | RegExp): string => {
  return pattern instanceof RegExp ? pattern?.source : (pattern ?? '.+')
}

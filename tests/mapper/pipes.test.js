import { POST, GET } from '../../src/enums/http-methods.mjs'
import { prependAction, prependActions, prependArrayProp, prependBindings, prependDefaults, prependDomain, prependMethods, prependName, prependPath, prependRules } from '../../src/mapper/pipes.mjs'

const mapPath = path => ({ path })
const mapName = name => ({ name })

describe('pipes', () => {
  describe('#prependPath', () => {
    it('Must prepend parent path to child', () => {
      // Act
      const res1 = prependPath(mapPath('users'), mapPath('profile'), (_, v) => v)
      const res2 = prependPath(mapPath('/users'), mapPath('/profile'), (_, v) => v)
      const res3 = prependPath(mapPath('/users/'), mapPath('/profile/'), (_, v) => v)
      const res4 = prependPath(mapPath('///users///'), mapPath('///profile///'), (_, v) => v)
      const res5 = prependPath(mapPath(null), mapPath('/profile'), (_, v) => v)
      const res6 = prependPath(mapPath(null), mapPath('/profile/'), (_, v) => v)
      const res7 = prependPath(mapPath('/users'), mapPath(null), (_, v) => v)
      const res8 = prependPath(mapPath(null), mapPath(null), (_, v) => v)

      // Assert
      expect(res1.path).toEqual('/users/profile')
      expect(res2.path).toEqual('/users/profile')
      expect(res3.path).toEqual('/users/profile/')
      expect(res4.path).toEqual('/users/profile/')
      expect(res5.path).toEqual('/profile')
      expect(res6.path).toEqual('/profile/')
      expect(res7.path).toEqual('/users/')
      expect(res8.path).toEqual('/')
    })
  })

  describe('#prependName', () => {
    it('Must prepend parent name to child', () => {
      // Act
      const res1 = prependName(mapName('users'), mapName('profile'), (_, v) => v)
      const res2 = prependName(mapName('users.'), mapName('.profile'), (_, v) => v)
      const res3 = prependName(mapName('.users.'), mapName('.profile.'), (_, v) => v)
      const res4 = prependName(mapName('...users...'), mapName('...profile...'), (_, v) => v)
      const res5 = prependName(mapName(null), mapName('.profile'), (_, v) => v)
      const res6 = prependName(mapName(null), mapName('.profile.'), (_, v) => v)
      const res7 = prependName(mapName('.users'), mapName(null), (_, v) => v)
      const res8 = prependName(mapName(null), mapName(null), (_, v) => v)

      // Assert
      expect(res1.name).toEqual('users.profile')
      expect(res2.name).toEqual('users.profile')
      expect(res3.name).toEqual('users.profile')
      expect(res4.name).toEqual('users.profile')
      expect(res5.name).toEqual('profile')
      expect(res6.name).toEqual('profile')
      expect(res7.name).toEqual('users')
      expect(res8.name).toEqual('')
    })
  })

  describe('#prependDomain', () => {
    it('Must get parent domain only if child domain is not defined', () => {
      // Act
      const res1 = prependDomain({ domain: 'parent.com' }, { domain: 'child.com' }, (_, v) => v)
      const res2 = prependDomain({ domain: 'parent.com' }, {}, (_, v) => v)
      const res3 = prependDomain({}, { domain: 'child.com' }, (_, v) => v)

      // Assert
      expect(res1.domain).toEqual('child.com')
      expect(res2.domain).toEqual('parent.com')
      expect(res3.domain).toEqual('child.com')
    })
  })

  describe('#prependMethods', () => {
    it('Must unique merge parent and child methods', () => {
      // Act
      const res1 = prependMethods({ method: GET }, { method: POST }, (_, v) => v)
      const res2 = prependMethods({ method: GET }, { methods: [POST] }, (_, v) => v)
      const res3 = prependMethods({ methods: [GET] }, { method: POST }, (_, v) => v)
      const res4 = prependMethods({ methods: [GET] }, { methods: [POST] }, (_, v) => v)
      const res5 = prependMethods({}, { method: POST }, (_, v) => v)
      const res6 = prependMethods({}, { methods: [POST] }, (_, v) => v)
      const res7 = prependMethods({ method: GET }, {}, (_, v) => v)
      const res8 = prependMethods({ methods: [GET] }, {}, (_, v) => v)

      // Assert
      expect(res1.methods).toEqual([GET, POST])
      expect(res2.methods).toEqual([GET, POST])
      expect(res3.methods).toEqual([GET, POST])
      expect(res4.methods).toEqual([GET, POST])
      expect(res5.methods).toEqual([POST])
      expect(res6.methods).toEqual([POST])
      expect(res7.methods).toEqual([GET])
      expect(res8.methods).toEqual([GET])
    })
  })

  describe('#prependArrayProp', () => {
    it('Must unique merge parent and child array props', () => {
      // Act
      const res1 = prependArrayProp({ policies: ['parent'] }, { policies: ['child'] }, (_, v) => v)
      const res2 = prependArrayProp({ policies: ['parent'] }, {}, (_, v) => v)
      const res3 = prependArrayProp({}, { policies: ['child'] }, (_, v) => v)
      const res4 = prependArrayProp({ methods: ['parent'] }, { methods: ['child'] }, (_, v) => v)
      const res5 = prependArrayProp({ alias: ['parent'] }, { alias: ['child'] }, (_, v) => v)
      const res6 = prependArrayProp({ children: ['parent'] }, { children: ['child'] }, (_, v) => v)

      // Assert
      expect(res1.policies).toEqual(['parent', 'child'])
      expect(res2.policies).toEqual(['parent'])
      expect(res3.policies).toEqual(['child'])
      expect(res4.methods).toEqual(['child'])
      expect(res5.alias).toEqual(['child'])
      expect(res6.children).toEqual(['child'])
    })
  })

  describe('#prependBindings', () => {
    it('Must unique merge parent and child bindings and must keep child key if exist in both', () => {
      // Act
      const res1 = prependBindings({ bindings: { name: 'parent', id: 'parent' } }, { bindings: { id: 'child' } }, (_, v) => v)
      const res2 = prependBindings({ bindings: { id: 'parent' } }, {}, (_, v) => v)
      const res3 = prependBindings({}, { bindings: { id: 'child' } }, (_, v) => v)

      // Assert
      expect(res1.bindings).toEqual({ name: 'parent', id: 'child' })
      expect(res2.bindings).toEqual({ id: 'parent' })
      expect(res3.bindings).toEqual({ id: 'child' })
    })
  })

  describe('#prependRules', () => {
    it('Must unique merge parent and child rules and must keep child key if exist in both', () => {
      // Act
      const res1 = prependRules({ rules: { name: 'parent', id: 'parent' } }, { rules: { id: 'child' } }, (_, v) => v)
      const res2 = prependRules({ rules: { id: 'parent' } }, {}, (_, v) => v)
      const res3 = prependRules({}, { rules: { id: 'child' } }, (_, v) => v)

      // Assert
      expect(res1.rules).toEqual({ name: 'parent', id: 'child' })
      expect(res2.rules).toEqual({ id: 'parent' })
      expect(res3.rules).toEqual({ id: 'child' })
    })
  })

  describe('#prependDefaults', () => {
    it('Must unique merge parent and child defaults and must keep child key if exist in both', () => {
      // Act
      const res1 = prependDefaults({ defaults: { name: 'parent', id: 'parent' } }, { defaults: { id: 'child' } }, (_, v) => v)
      const res2 = prependDefaults({ defaults: { id: 'parent' } }, {}, (_, v) => v)
      const res3 = prependDefaults({}, { defaults: { id: 'child' } }, (_, v) => v)

      // Assert
      expect(res1.defaults).toEqual({ name: 'parent', id: 'child' })
      expect(res2.defaults).toEqual({ id: 'parent' })
      expect(res3.defaults).toEqual({ id: 'child' })
    })
  })

  describe('#prependActions', () => {
    it('Must unique merge parent and child actions and must keep child key if exist in both', () => {
      // Act
      const res1 = prependActions({ actions: { name: 'parent', id: 'parent' } }, { actions: { id: 'child' } }, (_, v) => v)
      const res2 = prependActions({ actions: { id: 'parent' } }, {}, (_, v) => v)
      const res3 = prependActions({}, { actions: { id: 'child' } }, (_, v) => v)

      // Assert
      expect(res1.actions).toEqual({ name: 'parent', id: 'child' })
      expect(res2.actions).toEqual({ id: 'parent' })
      expect(res3.actions).toEqual({ id: 'child' })
    })
  })

  describe('#prependAction', () => {
    it('Must merge parent action to children parent is defined and keep children action otherwise', () => {
      // Act
      const Controller = class {}
      const res1 = prependAction({ action: Controller }, { action: 'child' }, (_, v) => v)
      const res2 = prependAction({}, { action: { child: Controller } }, (_, v) => v)
      const res3 = prependAction({ action: Controller }, { action: Controller }, (_, v) => v)

      const parent1 = prependAction({ action: Controller }, {}, (_, v) => v)
      const parent2 = prependAction(parent1, {}, (_, v) => v)
      const res4 = prependAction(parent1, { action: 'child' }, (_, v) => v)
      const res5 = prependAction(parent1, { action: Controller }, (_, v) => v)
      const res6 = prependAction(parent2, { action: 'child' }, (_, v) => v)

      // Assert
      expect(res1.action).toEqual({ child: Controller })
      expect(res2.action).toEqual({ child: Controller })
      expect(res3.action).toEqual([Controller, Controller])
      expect(res4.action).toEqual({ child: Controller })
      expect(res5.action).toEqual([Controller, Controller])
      expect(res6.action).toEqual({ child: Controller })
    })
  })
})

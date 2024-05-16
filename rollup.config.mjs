import copy from 'rollup-plugin-copy'
import babel from '@rollup/plugin-babel'
import multi from '@rollup/plugin-multi-entry'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import nodeExternals from 'rollup-plugin-node-externals'

const inputs = {
  config: 'src/config/*.mjs',
  commands: 'src/commands/*.mjs',
  decorators: 'src/decorators/*.mjs',
  index: [
    'src/Event.mjs',
    'src/Route.mjs',
    'src/Router.mjs',
    'src/pipes/*.mjs',
    'src/RouteCollection.mjs',
    'src/RoutingServiceProvider.mjs',
    'src/definition/RouteDefinition.mjs',
  ],
}

export default Object.entries(inputs).map(([name, input]) => ({
	input,
	output: [
    { format: 'es', file: `dist/${name}.js` }
  ],
  plugins: [
    multi(),
    nodeExternals({
      include: [/^[@stone-js/router]/]
    }), // Must always be before `nodeResolve()`.
    nodeResolve({
      exportConditions: ['node', 'import', 'require', 'default']
    }),
    babel({ babelHelpers: 'bundled' }),
    commonjs(),
    copy({
      targets: [
        { src: 'src/config/options.mjs', dest: 'dist' }
      ]
    })
  ]
}))
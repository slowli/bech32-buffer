const { fromRollup } = require('@web/dev-server-rollup');
const rollupCommonjs = require('@rollup/plugin-commonjs');
const rollupBabel = require('@rollup/plugin-babel');

const commonjs = fromRollup(rollupCommonjs);
const babel = fromRollup(rollupBabel);

module.exports = {
  nodeResolve: true,
  files: ['test/**.mjs'],
  plugins: [
    commonjs({
      include: ['node_modules/**'],
      strictRequires: 'auto',
    }),
    babel({
      babelHelpers: 'bundled',
    }),
  ],
};

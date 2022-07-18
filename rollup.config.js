import typescript from '@rollup/plugin-typescript';
import definitions from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';

export default [
	{
		input: './src/index.ts',
		output: [
			{
				file: './build/index.cjs.min.js',
				format: 'cjs'
			},
			{
				file: './build/index.esm.min.mjs',
				format: 'esm'
			}
		],
		external: [
			'@calmdownval/signal',
			'crypto',
			'http',
			'https',
			'url'
		],
		plugins: [
			typescript(),
			terser({
				output: {
					comments: false
				}
			})
		]
	},
	{
		input: './src/index.ts',
		output: {
			file: './build/index.d.ts',
			format: 'es'
		},
		external: [
			'@calmdownval/signal',
			'tls'
		],
		plugins: [
			definitions()
		]
	}
];

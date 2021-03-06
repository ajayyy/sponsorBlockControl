import path from 'path';
import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import copy from 'rollup-plugin-copy';
import alias from '@rollup/plugin-alias';
import sveltePreprocess from 'svelte-preprocess';
import postcssImport from 'postcss-import';
import rimraf from 'rimraf';
const pkg = require('./package.json');

const production = !process.env.ROLLUP_WATCH;

function cleanupBuildDir() {
  return {
    name: 'cleanup-build-dir',
    buildStart() {
      rimraf.sync('build');
    }
  }
}

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true,
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/main.js',
	output: {
		sourcemap: !production,
		format: 'iife',
		name: 'app',
		file: 'build/bundle.js',
	},
	plugins: [
    copy({
      targets: [{
        src: 'public/*',
        dest: 'build',
      }]
    }),

		svelte({
			// enable run-time checks when not in production
			dev: !production,
      // run preprocess stuff
      preprocess: sveltePreprocess({
        sourceMap: !production,
        postcss: {
          plugins: [
            postcssImport
          ]
        }
      }),
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css: css => {
				css.write('bundle.css', !production);
			}
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte'],
		}),

    // ES5 to ES6
		commonjs(),

    replace({
      delimiters: ['__', '__'],
      pkgVersion: pkg.version,
      pkgHomepage: pkg.homepage,
    }),

    alias({
      resolve: ['.js', '.svelte'],
      entries: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
      ]
    }),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `build` directory and refresh the
		// browser on changes when not in production
		!production && livereload('build'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser(),

    // cleanup the build dir
    cleanupBuildDir()
	],
	watch: {
		clearScreen: false
	}
};

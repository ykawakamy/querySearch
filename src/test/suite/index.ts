import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 30 * 1000,
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise(async (c, e) => {
		const files = await glob.glob('**/**.test.js', { cwd: testsRoot });
		// Add files to the test suite
		files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
		try {
			// Run the mocha test
			mocha.run(failures => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (err) {
			console.error(err);
			e(err);
		}
	});
}

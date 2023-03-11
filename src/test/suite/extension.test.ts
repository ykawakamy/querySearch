import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

describe('Array', function () {
	describe('#indexOf()', function () {
	  it('should return -1 when the value is not present', function () {
		assert.equal([1, 2, 3].indexOf(4), -1);
	  });
	});
  });

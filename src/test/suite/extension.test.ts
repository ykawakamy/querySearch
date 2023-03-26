import * as assert from 'assert';

import { after } from 'mocha';

import * as vscode from 'vscode';
import { SerachResult, SerachResultItem } from '../../model/search-result.model';
import { SearchResultPanelProvider } from '../../view/search-result-panel';

suite('Extension Test Suite', () => {
  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

	let extensionContext: vscode.ExtensionContext;
	let testee: SearchResultPanelProvider;
	
	suiteSetup(async () => {
			testee = new SearchResultPanelProvider();
	});

	test('replace', async () => {
		const document = await vscode.workspace.openTextDocument({ content:"<ul><li>file</li></ul>" });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
		const expected = "<ul></ul><li>file</li>";

		const result = await testee.refreshResult(document, queryExpr);
		testee.replace(result!.items[0], replaceExpr).then( ()=> {
			assert.equal(document.getText(), expected);
		});

	});
});
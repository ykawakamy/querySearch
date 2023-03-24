
import assert = require('assert');
import { after } from 'mocha';


import * as vscode from 'vscode';
import { SearchResultPanelProvider } from '../../view/search-result-panel';
// import * as myExtension from '../extension';

suite('Replace Script Test', () => {
  after(() => {
  });

	let testee: SearchResultPanelProvider;
	
	suiteSetup(async () => {
			testee = new SearchResultPanelProvider();
	});

	test('noop', async () => {
		const document = await vscode.workspace.openTextDocument({ content:"<ul><li>file</li></ul>" });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
		`;
		const expected = "<ul><li>file</li></ul>";

		const result = await testee.refreshResult(document, queryExpr);
		await testee.replace(result!.items[0], replaceExpr);
		assert.equal(document.getText(), expected);
	});

	test('remove and insert to AfterEnd', async () => {
		const document = await vscode.workspace.openTextDocument({ content:"<ul><li>file</li></ul>" });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
		const expected = "<ul></ul><li>file</li>";

		const result = await testee.refreshResult(document, queryExpr);
		await testee.replace(result!.items[0], replaceExpr);
		assert.equal(document.getText(), expected);
	});

	test('remove and insert to AfterEnd, multiline', async () => {
		const document = await vscode.workspace.openTextDocument({ content:`
		<ul>
		<li>file</li>
		</ul>
		` });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
		const expected = `
		<ul>
		
		</ul><li>file</li>
		`;

		const result = await testee.refreshResult(document, queryExpr);
		await testee.replace(result!.items[0], replaceExpr);
		assert.equal(document.getText(), expected);
	});


	test.skip('remove and insert to AfterEnd, preserve closing/empty tag', async () => {
		const document = await vscode.workspace.openTextDocument({ content:`
		<ul>
		<li />
		<li />
		</ul>
		` });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
		const expected = `
		<ul>
		
		<li />
		</ul><li />
		`;

		const result = await testee.refreshResult(document, queryExpr);
		await testee.replace(result!.items[0], replaceExpr);
		assert.equal(document.getText(), expected);
	});

	test('remove and insert to AfterEnd, preserve attribute order tag', async () => {
		const document = await vscode.workspace.openTextDocument({ content:`
		<ul>
		<li b="1" a="2"></li>
		</ul>
		` });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
		const expected = `
		<ul>
		
		</ul><li b="1" a="2"></li>
		`;

		const result = await testee.refreshResult(document, queryExpr);
		await testee.replace(result!.items[0], replaceExpr);
		assert.equal(document.getText(), expected);
	});

	test('setAttribute', async () => {
		const document = await vscode.workspace.openTextDocument({ content:`
		<ul>
		<li></li>
		</ul>
		` });
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			$.setAttribute("addAttr", "new");
		`;
		const expected = `
		<ul addAttr="new">
		<li></li>
		</ul>
		`;

		const result = await testee.refreshResult(document, queryExpr);
		await testee.replace(result!.items[0], replaceExpr);
		assert.equal(document.getText(), expected);
	});

});
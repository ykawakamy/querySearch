import assert = require("assert");
import { after } from "mocha";

import * as vscode from "vscode";
import { SearchResultPanelProvider } from "../../view/search-result-panel";
import { NodeHtmlParserAdaptor } from "../../engine/node-html-parser";
import { ReplaceDocument } from "../../engine/replace-edit";
// import * as myExtension from '../extension';

suite("ReplaceAll Script Test", () => {
  after(() => {});

  let testee: SearchResultPanelProvider;

  suiteSetup(async () => {
    testee = new SearchResultPanelProvider(new NodeHtmlParserAdaptor());
  });

  async function assertReplace(
    document: ReplaceDocument,
    search: string,
    replace: string,
    expected: unknown
  ) {
		const searchContext = {search, replace};
    const result = await testee.searchEngine.search(document, searchContext );
    await testee.replaceAll(result!, replace);
    assert.equal(document.getText(), expected);
  }

  test("remove and insert to AfterEnd", async () => {
    const document = await vscode.workspace.openTextDocument({
      content:
        "<ul><li>file</li><li>file</li></ul>" +
        "<ul><li>file</li><li>file</li></ul>",
    });
    const queryExpr= "ul:has(li)";
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected =
      "<ul><li>file</li></ul><li>file</li>"+ 
			"<ul><li>file</li></ul><li>file</li>";

			await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd, multiline", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li>file</li>
		<li>file</li>
		</ul>
		<ul>
		<li>file</li>
		<li>file</li>
		</ul>
		`,
    });
    const queryExpr = "ul:has(li)";
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected = `
		<ul>
		
		<li>file</li>
		</ul><li>file</li>
		<ul>
		
		<li>file</li>
		</ul><li>file</li>
		`;

		await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  // XXX closing/empty tag
  test.skip("remove and insert to AfterEnd, preserve closing/empty tag", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li />
		<li />
		</ul>
		`,
    });
    const queryExpr= "ul:has(li)";
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

		await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test.skip("remove and insert to AfterEnd, preserve closing/empty tag", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li />
		<li />
		</ul>
		`,
    });
    const queryExpr= "ul:has(li)";
    const replaceExpr = `
		`;
    const expected = `
		<ul>
		<li />
		<li />
		</ul>
		`;

		await assertReplace(document, queryExpr, replaceExpr, expected);
  });


  test("remove and insert to AfterEnd, preserve attribute order tag", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li b="1" a="2"></li>
		</ul>
		<ul>
		<li b="1" a="2"></li>
		</ul>
		`,
    });
    const queryExpr= "ul:has(li)";
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected = `
		<ul>
		
		</ul><li b="1" a="2"></li>
		<ul>
		
		</ul><li b="1" a="2"></li>
		`;

		await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("setAttribute", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li></li>
		</ul>
		<ul>
		<li></li>
		</ul>
		`,
    });
    const queryExpr= "ul:has(li)";
    const replaceExpr = `
			$.setAttribute("addAttr", "new");
		`;
    const expected = `
		<ul addAttr="new">
		<li></li>
		</ul>
		<ul addAttr="new">
		<li></li>
		</ul>
		`;

		await assertReplace(document, queryExpr, replaceExpr, expected);
  });

	test("nested", async () => {
		const document = await vscode.workspace.openTextDocument({
			content: `
		<ul>
		<li>
			<ul>
			<li>file1</li>
			<li>file2</li>
			</ul>
		</li>
		<li>file3</li>
		</ul>
		<ul>
		<li>file4</li>
		<li>file5</li>
		</ul>
		`,
		});
		const queryExpr = "ul:has(li)";
		const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
		const expected = `
		<ul>
		<li>file3</li>
		</ul><li>
			<ul>
			<li>file2</li>
			</ul><li>file1</li>
		</li>
		<ul>
		<li>file4</li>
		<li>file5</li>
		</ul>
		`;

		await assertReplace(document, queryExpr, replaceExpr, expected);
	});
});
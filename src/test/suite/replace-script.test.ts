import assert = require("assert");
import { after } from "mocha";

import * as vscode from "vscode";
import { SearchResultPanelProvider } from "../../view/search-result-panel";
import { SearchContext } from "../../engine/search-engine";
import { NodeHtmlParserAdaptor } from "../../engine/node-html-parser";
import { ReplaceDocument, ReplaceEditInMemory } from "../../engine/replace-edit";
// import * as myExtension from '../extension';

suite("Replace Script Test", () => {
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
		await testee.replace(result!.items[0], replace);
    assert.equal(document.getText(), expected);
  }

  test("noop", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: "<ul><li>file</li></ul>",
    });
    const queryExpr = "ul:has(li)";
    const replaceExpr = `
		`;
    const expected = "<ul><li>file</li></ul>";

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: "<ul><li>file</li></ul>",
    });
    const queryExpr = "ul:has(li)";
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected = "<ul></ul><li>file</li>";

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd, multiline", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
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
		
		</ul><li>file</li>
		`;

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  // TODO self closing/empty tag become decomposite by parser.
  test.skip("XXX remove and insert to AfterEnd, preserve closing/empty tag", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li />
		<li />
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
		
		<li />
		</ul><li />
		`;

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  // TODO self closing/empty tag become decomposite by parser.
  test("XXX remove and insert to AfterEnd, preserve attribute order tag", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li b="1" a="2"></li>
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
		
		</ul><li b="1" a="2"></li>
		`;

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("modify attributes", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul removeAttr="REMOVE" modifyAttr="OLD_VALUE" notModifyAttr="NOT_MODIFIED">
		<li></li>
		</ul>
		`,
    });
    const queryExpr = "ul:has(li)";
    const replaceExpr = `
			$.setAttribute("appendttr", "APPENDED");
			$.setAttribute("modifyAttr", "NEW_VALUE");
			$.removeAttribute("removeAttr");
		`;
    const expected = `
		<ul modifyAttr="NEW_VALUE" notModifyAttr="NOT_MODIFIED" appendttr="APPENDED">
		<li></li>
		</ul>
		`;

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("preserve comment block", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<!-- 
		  first
	  -->
		<li><!-- second --></li>
		<!-- third -->
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
		<!-- 
		  first
	  -->
		
		<!-- third -->
		</ul><li><!-- second --></li>
		`;

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("preserve multiline attribute", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul>
		<li onclick='
			console.log("one");
			console.log("two");
		'></li>
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

		</ul><li onclick='
			console.log("one");
			console.log("two");
		'></li>

		`;

    await assertReplace(document, queryExpr, replaceExpr, expected);
  });

  test("preserve multiline attribute", async () => {
    const document = await vscode.workspace.openTextDocument({
      content: `
		<ul onclick='
		  console.log("one");
		  console.log("two");
	  '>
		<li></li>
		</ul>
		`,
    });
    const queryExpr = "ul:has(li)" ;
    const replaceExpr = `
		$.setAttribute("replaced", "")
		`;
    const expected = `
		<ul onclick='
		  console.log("one");
		  console.log("two");
	  ' replaced>
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

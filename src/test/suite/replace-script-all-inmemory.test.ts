import assert = require("assert");
import { after } from "mocha";

import * as vscode from "vscode";
import { SearchResultPanelProvider } from "../../view/search-result-panel";
import { SearchContext } from "../../engine/search-engine";
import { NodeHtmlParserAdaptor } from "../../engine/node-html-parser";
import {
  ReplaceDocument,
  ReplaceEditInMemory,
} from "../../engine/replace-edit";
// import * as myExtension from '../extension';

suite("ReplaceAll Script Test", () => {
  after(() => {});

  let testee: NodeHtmlParserAdaptor;

  suiteSetup(() => {
    testee = new class extends NodeHtmlParserAdaptor{
			canApply(uri: vscode.Uri): boolean {
				return true;
			}
		};
  });

  async function assertReplace(
    document: ReplaceDocument,
    search: string,
    replace: string,
    expected: unknown
  ) {
    const searchContext = { search, replace };
    const edit = new ReplaceEditInMemory();
    const result = testee.search(document, searchContext);
    await testee.replace(result!, replace, edit);
		const replaced = await edit.modifiedTextDocument(document.uri);
    assert.equal( replaced.getText(), expected);
  }

  test("remove and insert to AfterEnd", async () => {
    const document = await vscode.workspace.openTextDocument({
      content:
        "<ul><li>file1</li><li>file2</li></ul>" +
        "<ul><li>file3</li><li>file4</li></ul>",
    });
    const queryExpr = "ul:has(li)" ;
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected =
      "<ul><li>file2</li></ul><li>file1</li>" +
      "<ul><li>file4</li></ul><li>file3</li>";

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

  test.skip("remove and insert to AfterEnd, preserve closing/empty tag", async () => {
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
    const queryExpr = "ul:has(li)";
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
    const queryExpr = "ul:has(li)";
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
});

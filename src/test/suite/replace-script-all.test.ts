import assert = require("assert");
import { after } from "mocha";

import * as vscode from "vscode";
import { SearchResultPanelProvider } from "../../view/search-result-panel";
import { NodeHtmlParserAdaptor } from "../../engine/node-html-parser";
import { ReplacePreviewDocumentProvider } from "../../view/replace-preview";
import { Tempfile } from "./tempFileUtil";

suite("ReplaceAll Script Test", () => {
  after(() => {});

  let testee = new SearchResultPanelProvider(
    new ReplacePreviewDocumentProvider(),
    new (class extends NodeHtmlParserAdaptor {
      canApply(uri: vscode.Uri): boolean {
        return true;
      }
    })()
  );

  let tempfile = new Tempfile();
  suiteSetup(async () => {});

  suiteTeardown(async () => {
    tempfile.cleanup();
  });

  async function assertReplace(
    document: vscode.TextDocument,
    search: string,
    replace: string,
    expected: unknown
  ) {
    const searchContext = { search, replace };
    const result = new NodeHtmlParserAdaptor().search(document, searchContext);

    await testee.replaceAll(result!);
    assert.equal(document.getText(), expected);
  }

  test("remove and insert to AfterEnd", async () => {
    const document = await tempfile.createDocument({
      content:
        "<ul><li>file</li><li>file</li></ul>" +
        "<ul><li>file</li><li>file</li></ul>",
    });
    const searchContext = "ul:has(li)";
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected =
      "<ul><li>file</li></ul><li>file</li>" +
      "<ul><li>file</li></ul><li>file</li>";

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd, multiline", async () => {
    const document = await tempfile.createDocument({
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
    const searchContext = "ul:has(li)";
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

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  // XXX closing/empty tag
  test.skip("remove and insert to AfterEnd, preserve closing/empty tag", async () => {
    const document = await tempfile.createDocument({
      content: `
		<ul>
		<li />
		<li />
		</ul>
		`,
    });
    const searchContext = "ul:has(li)";
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

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test.skip("remove and insert to AfterEnd, preserve closing/empty tag", async () => {
    const document = await tempfile.createDocument({
      content: `
		<ul>
		<li />
		<li />
		</ul>
		`,
    });
    const searchContext = "ul:has(li)";
    const replaceExpr = `
		`;
    const expected = `
		<ul>
		<li />
		<li />
		</ul>
		`;

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd, preserve attribute order tag", async () => {
    const document = await tempfile.createDocument({
      content: `
		<ul>
		<li b="1" a="2"></li>
		</ul>
		<ul>
		<li b="1" a="2"></li>
		</ul>
		`,
    });
    const searchContext = "ul:has(li)";
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

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("setAttribute", async () => {
    const document = await tempfile.createDocument({
      content: `
		<ul>
		<li></li>
		</ul>
		<ul>
		<li></li>
		</ul>
		`,
    });
    const searchContext = "ul:has(li)";
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

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("nested", async () => {
    const document = await tempfile.createDocument({
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
    const searchContext = "ul:has(li)";
    const replaceExpr = `
			var s = $.querySelector("li");
			$.removeChild(s);
			$.insertAdjacentHTML("afterend", s.outerHTML);
		`;
    const expected = "";

    await assert.rejects(
      async () => {
        await assertReplace(document, searchContext, replaceExpr, expected);
      },
      { name: "Error", message: "cannot applyEdit." }
    );
  });
});

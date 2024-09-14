import assert = require("assert");
import { after } from "mocha";

import * as vscode from "vscode";
import { NodeHtmlParserAdaptor } from "../../engine/node-html-parser";
import { SearchResultPanelProvider } from "../../view/search-result-panel";
import { ReplacePreviewDocumentProvider } from "../../view/replace-preview";
import { Tempfile } from "./tempFileUtil";
import { defaultSearchContext } from "../../model/search-context.model";

suite("Replace Script Test", () => {
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

  async function assertReplace(
    document: vscode.TextDocument,
    search: string,
    replace: string,
    expected: unknown
  ) {
    const searchContext = {
      ...defaultSearchContext,
      search,
      replaceContext: {
        replace,
        replaceToggle: false,
      },
    };
    const result = new NodeHtmlParserAdaptor().search(document.getText(), document.uri, searchContext);
    testee.latestSearchContext = searchContext;
    await testee.replace(result!.items[0]);
    assert.equal(document.getText(), expected);
  }

  test("noop", async () => {
    const content = "<ul><li>file</li></ul>";
    const document = await tempfile.createDocument({ content });
    const searchContext = "ul:has(li)";
    const replaceExpr = `
    `;
    const expected = "<ul><li>file</li></ul>";

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd", async () => {
    const content = "<ul><li>file</li></ul>";
    const document = await tempfile.createDocument({ content });
    const searchContext = "ul:has(li)";
    const replaceExpr = `
      var s = $.querySelector("li");
      $.removeChild(s);
      $.insertAdjacentHTML("afterend", s.outerHTML);
    `;
    const expected = "<ul></ul><li>file</li>";

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("remove and insert to AfterEnd, multiline", async () => {
    const document = await tempfile.createDocument({
      content: `
    <ul>
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
    
    </ul><li>file</li>
    `;

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  // TODO self closing/empty tag become decomposite by parser.
  test.skip("XXX remove and insert to AfterEnd, preserve closing/empty tag", async () => {
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

  // TODO self closing/empty tag become decomposite by parser.
  test("XXX remove and insert to AfterEnd, preserve attribute order tag", async () => {
    const document = await tempfile.createDocument({
      content: `
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
    `;

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("modify attributes", async () => {
    const document = await tempfile.createDocument({
      content: `
    <ul removeAttr="REMOVE" modifyAttr="OLD_VALUE" notModifyAttr="NOT_MODIFIED">
    <li></li>
    </ul>
    `,
    });
    const searchContext = "ul:has(li)";
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

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("preserve comment block", async () => {
    const document = await tempfile.createDocument({
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
    const searchContext = "ul:has(li)";
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

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("preserve multiline attribute", async () => {
    const document = await tempfile.createDocument({
      content: `
    <ul>
    <li onclick='
      console.log("one");
      console.log("two");
    '></li>
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
    
    </ul><li onclick='
      console.log("one");
      console.log("two");
    '></li>
    `;

    await assertReplace(document, searchContext, replaceExpr, expected);
  });

  test("preserve multiline attribute", async () => {
    const document = await tempfile.createDocument({
      content: `
    <ul onclick='
      console.log("one");
      console.log("two");
    '>
    <li></li>
    </ul>
    `,
    });
    const searchContext = "ul:has(li)";
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
    const expected = `
    <ul>
    
    <li>file3</li>
    </ul><li>
      <ul>
      <li>file1</li>
      <li>file2</li>
      </ul>
    </li>
    <ul>
    <li>file4</li>
    <li>file5</li>
    </ul>
    `;

    await assertReplace(document, searchContext, replaceExpr, expected);
  });
});

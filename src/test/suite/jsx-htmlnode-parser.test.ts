import assert = require("assert");
import { after } from "mocha";

import * as vscode from "vscode";
import { NodeHtmlParserAdaptor } from "../../engine/node-html-parser";
import { SearchResultPanelProvider } from "../../view/search-result-panel";
import { ReplacePreviewDocumentProvider } from "../../view/replace-preview";
import { Tempfile } from "./tempFileUtil";
import { defaultSearchContext } from "../../model/search-context.model";
import { JsxHtmlParserAdapter } from "../../engine/jsx-htmlnode-parser";

suite("Replace Script Test for Javascript like file", () => {
  let testee = new SearchResultPanelProvider(
    new ReplacePreviewDocumentProvider(),
    new (class extends NodeHtmlParserAdaptor {
      canApply(uri: vscode.Uri): boolean {
        return true;
      }
    })()
  );

  let tempfile = new Tempfile();

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
    const result = new JsxHtmlParserAdapter().search(document, searchContext);
    testee.latestSearchContext = searchContext;
    if( result){
      // for( const item of result.items){
      //   console.log("match - %d %d - %s", item.range.start, item.range.end, item.label);
      // }
      await testee.replaceAll(result);
    }
    const actuall = document.getText();
    assert.equal(actuall, expected);
  }

  suite("JSX like", () => {
    test("simple function component", async () => {
      const content = `const Test = ()=>(<ul><li will-replace>text</li></ul>);`;
      const expected = `const Test = ()=>(<ul><div></div></ul>);`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });

    test("simple function component with prop", async () => {
      const content = `const B = (prop)=> <ul><li will-replace>{prop.text}</li></ul>;`;
      const expected = `const B = (prop)=> <ul><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });
    test("ignore HTML-Markup in javascript-expression attribute", async () => {
      const content = `const C = (prop)=> <ul data-html={<ul><li>text</li></ul>}><li>text</li></ul>;`;
      const expected = `const C = (prop)=> <ul data-html={<ul><li>text</li></ul>}><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });
    test("ignore HTML-like text in javascript-expression attribute", async () => {
      const content = `const D = (prop)=> <ul data-text={'<ul><li>text</li></ul>'}><li>text</li></ul>;`;
      const expected = `const D = (prop)=> <ul data-text={'<ul><li>text</li></ul>'}><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });
    test("ignore HTML-like text in html attribute", async () => {
      const content = `const F = (prop)=> <ul data-text='<ul><li>text</li></ul>'><li>text</li></ul>;`;
      const expected = `const F = (prop)=> <ul data-text='<ul><li>text</li></ul>'><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });
  });

  suite("Javascript Like", () => {
    suite("HTML-Like text in literals", ()=>{
      test("replace HTML-like text", async () => {
        const content = `const Test = "<ul><li will-replace>text</li></ul>");`;
        const expected = `const Test = "<ul><div></div></ul>");`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, expected);
      });
  
      test("ignore HTML-like text in attribute", async () => {
        const content = `const Test = "<div className='<ul><li>file</li></ul>'><ul><li  will-replace>text</li></ul></div>";`;
        const expected = `const Test = "<div className='<ul><li>file</li></ul>'><ul><div></div></ul></div>";`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, expected);
      });
  
      test("replace open/close tag in each literals, but ignore close tag", async () => {
        const content = `
        const Test = "<ul><li will-replace>preserve";
        const Test2 = "</li></ul>";
        `;
        const expected = `
        const Test = "<ul><div></div>preserve";
        const Test2 = "</li></ul>";
        `;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, expected);
      });
    });

    suite("HTML-Like text in comments", () => {
      test("replace HTML-like text", async () => {
        const content = `/* <ul><li will-replace>text</li></ul> */`;
        const expected = `/* <ul><div></div></ul> */`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, expected);
      });
  
      test("ignore HTML-like text in attribute", async () => {
        const content = `/* <div className='<ul><li>file</li></ul>'><ul><li  will-replace>text</li></ul></div> */`;
        const expected = `/* <div className='<ul><li>file</li></ul>'><ul><div></div></ul></div> */`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, expected);
      });
  
      test("replace open/close tag in each comments, but ignore close tag", async () => {
        const content = `
        /* <ul><li will-replace>preserve */
        /* </li></ul> */
        `;
        const expected = `
        /* <ul><div></div>preserve */
        /* </li></ul> */
        `;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, expected);
      });
    });
  });

  suite("complex pattern", () => {
    test("trailing comment", async () => {
      const content = `
      const Test = "<ul><li will-replace>text</li></ul>");
      /* <ul><li will-replace>text</li></ul> */
      `;
      const expected = `
      const Test = "<ul><div></div></ul>");
      /* <ul><div></div></ul> */
      `;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });

    test("leading comment", async () => {
      const content = `
      /* <ul><li will-replace>text</li></ul> */
      const Test = "<ul><li will-replace>text</li></ul>");
      `;
      const expected = `
      /* <ul><div></div></ul> */
      const Test = "<ul><div></div></ul>");
      `;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });

    test("leading comment", async () => {
      const content = `
      /* <ul><li will-replace>text</li></ul> */
      const Test = "<ul><li will-replace>text</li></ul>");
      /* <ul><li will-replace>text</li></ul> */
      `;
      const expected = `
      /* <ul><div></div></ul> */
      const Test = "<ul><div></div></ul>");
      /* <ul><div></div></ul> */
      `;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, expected);
    });
  });

});

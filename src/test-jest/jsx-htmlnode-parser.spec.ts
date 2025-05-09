import assert from "assert";
import { after } from "mocha";

import vscode from "vscode";
import { JsxSearchEngine } from "../engine/jsx-search-engine";
import { NodeHtmlSearchEngine } from "../engine/node-html-search-engine";
import { defaultSearchContext } from "../model/search-context.model";
import { ReplacePreviewDocumentProvider } from "../view/replace-preview";
import { SearchResultPanelProvider } from "../view/search-result-panel";
import { Mockfile } from "./mockFileUtil";

describe("Replace Script Test for Javascript like file", () => {
  let tempfile = new Mockfile();
  
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
    const result = new JsxSearchEngine().search(document.getText(), document.uri, searchContext);
    assert.equal(result?.items.length, expected);
  }

  describe("JSX like", () => {
    test("simple function component", async () => {
      const content = `const Test = ()=>(<ul><li will-replace>text</li></ul>);`;
      const expected = `const Test = ()=>(<ul><div></div></ul>);`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, 1);
    });

    test("simple function component with prop", async () => {
      const content = `const B = (prop)=> <ul><li will-replace>{prop.text}</li></ul>;`;
      const expected = `const B = (prop)=> <ul><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, 1);
    });
    test("ignore HTML-Markup in javascript-expression attribute", async () => {
      const content = `const C = (prop)=> <ul data-html={<ul><li>text</li></ul>}><li>text</li></ul>;`;
      const expected = `const C = (prop)=> <ul data-html={<ul><li>text</li></ul>}><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, 1);
    });
    test("ignore HTML-like text in javascript-expression attribute", async () => {
      const content = `const D = (prop)=> <ul data-text={'<ul><li>text</li></ul>'}><li>text</li></ul>;`;
      const expected = `const D = (prop)=> <ul data-text={'<ul><li>text</li></ul>'}><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, 1);
    });
    test("ignore HTML-like text in html attribute", async () => {
      const content = `const F = (prop)=> <ul data-text='<ul><li>text</li></ul>'><li>text</li></ul>;`;
      const expected = `const F = (prop)=> <ul data-text='<ul><li>text</li></ul>'><div></div></ul>;`;
      const searchContext = "li";
      const replaceExpr = `
      $.replaceWith(document.createElement("div"))
      `;

      const document = await tempfile.createDocument({ content });
      await assertReplace(document, searchContext, replaceExpr, 1);
    });
  });

  describe("Javascript Like", () => {
    describe("HTML-Like text in literals", ()=>{
      test("replace HTML-like text", async () => {
        const content = `const Test = "<ul><li will-replace>text</li></ul>");`;
        const expected = `const Test = "<ul><div></div></ul>");`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, 1);
      });
  
      test("ignore HTML-like text in attribute", async () => {
        const content = `const Test = "<div className='<ul><li>file</li></ul>'><ul><li  will-replace>text</li></ul></div>";`;
        const expected = `const Test = "<div className='<ul><li>file</li></ul>'><ul><div></div></ul></div>";`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, 1);
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
        await assertReplace(document, searchContext, replaceExpr, 1);
      });
    });

    describe("HTML-Like text in comments", () => {
      test("replace HTML-like text", async () => {
        const content = `/* <ul><li will-replace>text</li></ul> */`;
        const expected = `/* <ul><div></div></ul> */`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, 1);
      });
  
      test("ignore HTML-like text in attribute", async () => {
        const content = `/* <div className='<ul><li>file</li></ul>'><ul><li  will-replace>text</li></ul></div> */`;
        const expected = `/* <div className='<ul><li>file</li></ul>'><ul><div></div></ul></div> */`;
        const searchContext = "li";
        const replaceExpr = `
        $.replaceWith(document.createElement("div"))
        `;
  
        const document = await tempfile.createDocument({ content });
        await assertReplace(document, searchContext, replaceExpr, 1);
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
        await assertReplace(document, searchContext, replaceExpr, 1);
      });
    });
  });

  describe("complex pattern", () => {
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
      await assertReplace(document, searchContext, replaceExpr, 2);
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
      await assertReplace(document, searchContext, replaceExpr, 2);
    });

    test("leading comment2", async () => {
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
      await assertReplace(document, searchContext, replaceExpr, 3);
    });
  });

});

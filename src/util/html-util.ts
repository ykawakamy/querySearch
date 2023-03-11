import * as HTMLParser from "node-html-parser";

export namespace htmlUtil {
  export function getOffsetOfOpenTag(v: HTMLParser.HTMLElement) {
    const startOffset = v.range[0];
    const endOffset = Math.min(
      ...[v.range[1], v.firstChild?.range[0], v.nextSibling?.range[0]].filter(
        (v) => v
      )
    );

    return { startOffset, endOffset };
  }

  export function getOffsetOfCloseTag(v: HTMLParser.HTMLElement) {
    const startOffset = v.range[0];
    const endOffset = v.range[1];

    return { startOffset, endOffset };
  }
}

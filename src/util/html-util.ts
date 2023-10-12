import { PHtmlDocument } from "html-parser/dist/model/PHtml";
import { PHtmlElement } from "html-parser/dist/model/PHtmlElement";
import { PHtmlNode } from "html-parser/dist/model/PHtmlNode";
import { QSNode } from "../engine/search-engine";

export namespace htmlUtil {
  export function getOffsetOfOpenTag(v: QSNode) {
    const startOffset = v.range[0];
    const endOffset = Math.min(
      ...[v.range[1], v.firstChild?.range[0], v.nextSibling?.range[0]].filter(
        (v) => v
      )
    );

    return { startOffset, endOffset };
  }

  export function getOffsetOfCloseTag(v: QSNode) {
    if( v instanceof PHtmlElement || v instanceof PHtmlNode || v instanceof PHtmlDocument ){
      const r = v.range!;
      return { startOffset:r.startOpenTag, endOffset:r.endCloseTag };
    }
    return { startOffset:0, endOffset:0 };
  }
}

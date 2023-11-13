import { PHtmlDocument } from "html-parser/dist/model/PHtml";
import { PHtmlElement } from "html-parser/dist/model/PHtmlElement";
import { PHtmlNode } from "html-parser/dist/model/PHtmlNode";
import { QSNode } from "../model/search-context.model";

export namespace htmlUtil {
  export function getOffsetOfCloseTag(v: QSNode) {
    if( v instanceof PHtmlElement || v instanceof PHtmlNode || v instanceof PHtmlDocument ){
      const r = v.range!;
      return { startOffset:r.startOpenTag, endOffset:r.endCloseTag };
    }
    return { startOffset:0, endOffset:0 };
  }
}

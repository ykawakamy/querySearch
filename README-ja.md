# querysearch
これはHTMLファイルからcssセレクタに一致するタグを検索する拡張機能です。

## 使い方
### 検索
`QUERYPANEL`パネルに`CSSセレクタ`を入力し、`Search`をクリックしてください。
`SEARCH RESULT`パネルに検索結果が一覧されます。  

![search](search.gif)

### 置換
**この機能は実験的なものです。今後使用方法に変更があるかもしれません。**  
置換機能には`javascript`を利用しています。 

検索されたタグは`$`として扱われ、
DOMの[Node](https://developer.mozilla.org/ja/docs/Web/API/Node)や
[Element](https://developer.mozilla.org/ja/docs/Web/API/Element)
のプロパティ、メソッドが一部利用可能です。  

#### ex. 最初のliを抜き出し、/ulタグの後ろにつける。

![replace](replace.gif)
```javascript:
/*
  selector: "ul:has(li) "
  input:
    <ul>
      <li>first</li>
      <li>second</li>
      <li>third</li>
    </ul>
*/
var s = $.querySelector("li");
$.removeChild(s);
$.insertAdjacentHTML("afterend", s.outerHTML);
/*
  result:
    <ul>
      <li>second</li>
      <li>third</li>
    </ul><li>first</li>
*/
```

#### ex. 属性の追加/変更/削除
```javascript:
/*
  selector: "ul:has(li) "
  input:
		<ul removeAttr="REMOVE" modifyAttr="OLD_VALUE" notModifyAttr="NOT_MODIFIED">
  		<li></li>
		</ul>
*/
$.setAttribute("appendttr", "APPENDED");
$.setAttribute("modifyAttr", "NEW_VALUE");
$.removeAttribute("removeAttr");

/*
  result:
		<ul modifyAttr="NEW_VALUE" notModifyAttr="NOT_MODIFIED" appendttr="APPENDED">
		<li></li>
		</ul>
*/
```

####
> 注意: 現バージョンでは、`$`の祖先となる要素を操作することはできません。(e.g. `$.parentNode`).    
> これは`$`はDOMツリーの要素を直接示しているわけではなく、クローンであるためです。

#### 

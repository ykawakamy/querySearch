# querysearch
これはHTMLファイルからcssセレクタに一致するタグを検索する拡張機能です。

## 使い方
### 検索
`QUERYPANEL`パネルにcssセレクタを入力し、`search`をクリックしてください。
`SEARCH RESULT`に検索結果が一覧されます。  

```
  ex) "ul li"で下記の検索した場合、
  <ul>
    <li>first<li>
    <li>second<li>
  </ul>
```

### 置換
**この機能は実験的なものです。今後使用方法に変更があるかもしれません。**  
置換機能には`javascript`を利用しています。 

検索されたタグは`$`として扱われ、
DOMの[Node](https://developer.mozilla.org/ja/docs/Web/API/Node)や
[Element](https://developer.mozilla.org/ja/docs/Web/API/Element)
のプロパティ、メソッドが一部利用可能です。  

#### ex) ul:has(li)で検索した下記のHTMLに対して、最初のliを抜き出し、/ulタグの後ろにつける。

```javascript:
/*
  input:
    <ul>
      <li>first<li>
      <li>second<li>
    </ul>
*/
var s = $.querySelector("li");
$.removeChild(s);
$.insertAdjacentHTML("afterend", s.outerHTML);
/*
  result:
    <ul>
      <li>second<li>
    </ul><li>first<li>
*/
```

## TODO
- [ ] 設定の追加
  - [ ] 対象ファイルの拡張子、languageのフィルタ
- [ ] 検索対象ファイルのinclude/exclude
  - [x] .gitignoreの除外
- [ ] 置換モードの改善
  - [ ] 置換モード時のプレビュー
  - [ ] 置換スクリプトエディタ

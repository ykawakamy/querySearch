# querysearch

This extension is search html file by `CSS Selector`.

## Usage
### Search 
input `CSS Selector` to `QUERYPANEL`, click `Search` button.
see `SEARCH RESULT`.

![search](search.gif)

### Replace
**This feature is experimental, may be changed in a future.**  
Replace feature is implemented by `javascript` sandbox.

variable `$` is defined select element. 
DOM's [Node](https://developer.mozilla.org/ja/docs/Web/API/Node) 
and [Element](https://developer.mozilla.org/ja/docs/Web/API/Element)
methods and propeperties are partial available

#### ex. remove first `li` element and insert it after `ul` closing tag. 

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

#### ex. append/modify/remove attributes.
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
> ATTENTION: In current version, does not allow manipulate the ancestor elements of `$` (e.g. `$.parentNode`).  
> Because `$` element is clone, but isn't indicated DOM tree directly. 

# SORRY
This translation was written by someone who is not a native English speaker.
there may be errors in the translation.

see [README-ja.md](./README-ja.md)

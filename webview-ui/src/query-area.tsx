import {
  VSCodeTextField,
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import { SearchContext } from 'querysearch/src/model/search-context.model';
import { DoSearchEvent, PatchSearchContext } from 'querysearch/src/model/webview-event';
import { l10nCtx } from "./l10n-context";
import { useState } from "react";
import { vscode } from "./utilities/vscode";

import "querysearch/node_modules/@vscode/codicons/dist/codicon.css";
import "querysearch/node_modules/@vscode/codicons/dist/codicon.ttf";

import "./query-area.css";

export default function QueryArea() {

  const searchContext: SearchContext= vscode.getState() || {} as SearchContext;

  const [search, setSearch] = useState(searchContext.search ?? "");
  const [replace, setReplace] = useState(searchContext.replace ?? "");
  const [replaceToggle, setReplaceToggle] = useState(searchContext.replaceToggle ?? false);
  const [filterToggle, setFilterToggle] = useState(searchContext.filterToggle ?? false);
  const [includes, setIncludes] = useState(searchContext.includes ?? "");
  const [excludes, setExcludes] = useState(searchContext.excludes ?? "");
  const [matchCase, setMatchCase] = useState(searchContext.matchCase ?? false);

  function doSearch(): void {
    const newSearchContext: SearchContext = {
      search,
      replace,
      replaceToggle,
      filterToggle,
      includes,
      excludes,
      matchCase,
    };

    vscode.setState(newSearchContext);
    vscode.postMessage<DoSearchEvent>({
      type: "do-search",
      ...newSearchContext
    });
  }

  function onChangeReplace(e:any){
    const newValue = e.target.value;
    searchContext.replace = newValue;

    setReplace(newValue);
    vscode.setState(searchContext);

    vscode.postMessage<PatchSearchContext>({
      type: "patch-search-context",
      replace: newValue,
    });
  }

  function onChangeReplaceToggle(e:any){
    const newValue = !replaceToggle;
    searchContext.replaceToggle = newValue;

    setReplaceToggle(newValue);
    vscode.setState(searchContext);

    vscode.postMessage<PatchSearchContext>({
      type: "patch-search-context",
      replaceToggle: newValue,
    });
  }

  function onChangeFilterToggle(e:any){
    const newValue = !filterToggle;
    searchContext.filterToggle = newValue;

    setFilterToggle(newValue);
    vscode.setState(searchContext);

    vscode.postMessage<PatchSearchContext>({
      type: "patch-search-context",
      filterToggle: newValue,
    });
  }

  function onChangeMatchCase(e:any){
    const newValue = !matchCase;
    searchContext.matchCase = newValue;

    setMatchCase(newValue);
    vscode.setState(searchContext);

    vscode.postMessage<PatchSearchContext>({
      type: "patch-search-context",
      matchCase: newValue,
    });
  }

  return (
    <main>
      <section className="query-area">
        <VSCodeButton appearance="icon" onClick={e=>onChangeReplaceToggle(e)}>
        <section className="replace-toggle">
            <i className={replaceToggle ? "codicon codicon-chevron-down" : "codicon codicon-chevron-right"}></i>
        </section>
        </VSCodeButton>
        <section className="fill-container">
            <VSCodeTextField id="query-expr" 
              className="fill-container"
              autofocus 
              value={search} onChange={(e:any)=>setSearch(e.target.value)} >
                <VSCodeButton slot="end" appearance="icon" 
                  className={ matchCase ? "active_option" : "" }
                  onClick={e=>onChangeMatchCase(e)}
                  aria-label="Match Case">
                  <span className="codicon codicon-case-sensitive"></span>
                </VSCodeButton>
            </VSCodeTextField>
          <section>
            <VSCodeButton aria-label="do search" onClick={e=>doSearch()}>
              {l10nCtx.t("search")}
            </VSCodeButton>
          </section>
          {
            replaceToggle &&
            <VSCodeTextArea 
              id="replace-expr" 
              className="fill-container"
              rows={3} resize="vertical"
              placeholder="experimental: ex) $.insertAdjacentHTML('afterend', $.removeChild($.querySelector('div')).outerHTML); $"
              value={replace} onChange={onChangeReplace}>
              <section slot="end" className="inline-button">
                <VSCodeButton appearance="icon" aria-label="Match Case">
                  <span className="codicon codicon-case-sensitive"></span>
                </VSCodeButton>
              </section>
            </VSCodeTextArea>
          }
        </section>
      </section>
      <section className="filter-area">
        <div>
          <div className="filter-toggle" id="filter-toggle" onClick={(e:any)=>onChangeFilterToggle(e)}>
            <div className="icon"><i className="codicon codicon-kebab-horizontal"></i></div>
          </div>
        </div>
        {
          filterToggle && 
          <div>
            <h4>{l10nCtx.t("files to include")}</h4>
            <VSCodeTextField id="filter-includes" className="fill-container" value={includes} onChange={(e:any)=>setIncludes(e.target.value)}/>
            <h4>{l10nCtx.t("files to exclude")}</h4>
            <VSCodeTextField id="filter-excludes" className="fill-container" value={excludes} onChange={(e:any)=>setExcludes(e.target.value)}/>
          </div>
        }
      </section>

    </main>
  );
}

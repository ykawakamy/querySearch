import { defaultSearchContext, defaultWebViewState, ReplaceContext, SearchContext, WebViewState } from '../model/search-context.model';
import { DoSearchEvent, PatchSearchContext } from '../model/webview-event';
import { KeyboardEvent, useEffect, useState } from "react";
import { vscode } from "./utilities/vscode";

import "./query-area.css";
import * as  l10n from "@vscode/l10n";
import { ResultTreeView } from "./result-tree-view";
import useEvent from "@react-hook/event";

export default function QueryArea() {

  const vsState: WebViewState = vscode.getState<WebViewState>() || defaultWebViewState;
  vsState.replaceContext = vsState.replaceContext ?? {};

  const [state, setState] = useState<SearchContext>({
    ...defaultSearchContext,
    ...vsState
  });

  const [resultMessage, setResultMessage] = useState("");
  const [error, setError] = useState<any>({});
  function doSearch(): void {
    const newSearchContext: SearchContext = {
      search: state.search,
      filterToggle: state.filterToggle,
      includes: state.includes,
      excludes: state.excludes,
      matchCase: state.matchCase,
      replaceContext: {
        replace: state.replaceContext.replace,
        replaceToggle: state.replaceContext.replaceToggle,
      },
      isOnlyOpened: state.isOnlyOpened,
      isUseSettings: state.isUseSettings
    };

    const searchHistory = pushLast(vsState.searchHistory ?? [], state.search);
    const replaceHistory = pushLast(vsState.replaceHistory ?? [], state.replaceContext.replace);
    const includeHistory = pushLast(vsState.includeHistory ?? [], state.includes);
    const excludeHistory = pushLast(vsState.excludeHistory ?? [], state.excludes);

    const newState = {
      ...newSearchContext,
      searchHistory,
      replaceHistory,
      includeHistory,
      excludeHistory,
    };

    vscode.setState(newState);
    vscode.postMessage<DoSearchEvent>({
      type: "do-search",
      ...newSearchContext
    });
  }

  function onChangeState(e: any, patched: Partial<SearchContext>) {
    setState({
      ...state,
      ...patched,
    });
    vscode.setState({
      ...vsState,
      ...patched,
    });
  }
  function onChangeReplaceState(e: any, patched: Partial<ReplaceContext>) {
    setState({
      ...state,
      replaceContext: {
        ...state.replaceContext,
        ...patched
      }
    });
    vscode.setState({
      ...vsState,
      replaceContext: {
        ...state.replaceContext,
        ...patched,
      }
    });
    vscode.postMessage<PatchSearchContext>({
      type: "patch-search-context",
      ...patched
    });
  }

  function onSearchKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter") {
      doSearch();
    }
    setState(prev => ({
      ...prev,
      search: handleHistory(e, vsState.searchHistory, vsState.search)
    }));
  }

  function onIncludeKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter") {
      doSearch();
    }
    setState(prev => ({
      ...prev,
      includes: handleHistory(e, vsState.includeHistory, vsState.includes)
    }));
  }
  function onExcludeKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter") {
      doSearch();
    }
    setState(prev => ({
      ...prev,
      excludes: handleHistory(e, vsState.excludeHistory, vsState.excludes)
    }));
  }

  useEvent(window, "message", (e: MessageEvent<any>) => {
    const message = e.data;
    if (message.error) {
      setError(message.error);
    }
  });
  return (
    <main>
      <section className="query-area">
        <div className="replace-toggle-wrapper">
          <button className="icon replace-toggle" onClick={e => onChangeReplaceState(e, { replaceToggle: !state.replaceContext.replaceToggle })}>
            <i className={state.replaceContext.replaceToggle ? "codicon codicon-chevron-down" : "codicon codicon-chevron-right"}></i>
          </button>
        </div>
        <section className="fill-container">
          <section className={"input-container" + (error.searchInput ? " error" : "")}>
            <div className="input-wrapper">
              <input type="text" value={state.search} onChange={e => onChangeState(e, { search: e.target.value })} onKeyDown={onSearchKeydown} />
              <div className='input-action' >
                <button
                  className={state.matchCase ? "active-option" : ""}
                  onClick={e => onChangeState(e, { matchCase: !state.matchCase })}
                  aria-label="Match Case">
                  <span className="codicon codicon-case-sensitive"></span>
                </button>
              </div>
            </div>
            <div className='input-error-wrapper'>
              {error.searchInput && <div className='input-error'>{error.searchInput}</div>}
            </div>
          </section>
          <section>
            <button aria-label="do search" onClick={e => doSearch()}>
              {l10n.t("search")}
            </button>
          </section>
          {
            state.replaceContext.replaceToggle &&
            <section className="fill-container input-wrapper">
              <textarea id="replace-expr"
                rows={3}
                placeholder="experimental: ex) $.insertAdjacentHTML('afterend', $.removeChild($.querySelector('div')).outerHTML); $"
                value={state.replaceContext.replace} onChange={e => onChangeReplaceState(e, { replace: e.target.value })}>
              </textarea>
            </section>
          }
        </section>
      </section>
      <section className="filter-area">
        <div className={state.filterToggle ? '' : 'filter-toggle-wrapper'}>
          <div className="filter-toggle" id="filter-toggle" onClick={e => onChangeState(e, { filterToggle: !state.filterToggle })}>
            <div className="icon"><i className="codicon codicon-kebab-horizontal"></i></div>
          </div>
        </div>
        <div>
          {resultMessage}
        </div>
        {
          state.filterToggle &&
          <div>
            <h4>{l10n.t("files to include")}</h4>
            <div className="input-wrapper">
              <input type="text" id="filter-includes" className="fill-container" value={state.includes} onChange={e => onChangeState(e, { includes: e.target.value })} onKeyDown={onIncludeKeydown} />
              <div className='input-action' >
                <button
                  className={state.isOnlyOpened ? "active-option" : ""}
                  onClick={e => onChangeState(e, { isOnlyOpened: !state.isOnlyOpened })}
                  aria-label="isOnlyOpened">
                  <span className="codicon codicon-book"></span>
                </button>
              </div>
            </div>
            <h4>{l10n.t("files to exclude")}</h4>
            <div className="input-wrapper">
              <input type="text" id="filter-excludes" className="fill-container" value={state.excludes} onChange={e => onChangeState(e, { excludes: e.target.value })} onKeyDown={onExcludeKeydown} />
              <div className='input-action' >
                <button
                  className={state.isUseSettings ? "active-option" : ""}
                  onClick={e => onChangeState(e, { isUseSettings: !state.isUseSettings })}
                  aria-label="exclude">
                  <span className="codicon codicon-exclude"></span>
                </button>
              </div>
            </div>
          </div>
        }
      </section>
      <section className="result-area">
        <ResultTreeView></ResultTreeView>
      </section>
    </main>
  );

  function handleHistory(e: KeyboardEvent<HTMLInputElement>, history: string[], value: string) {
    if (e.key === "ArrowUp" /* && e.currentTarget.selectionStart === 0 */) {
      const idx = history.indexOf(value);
      if (idx > 0) {
        return history[idx - 1];
      }
    }
    if (e.key === "ArrowDown" /* && e.currentTarget.selectionStart === e.currentTarget.value.length */) {
      const idx = history.indexOf(value);
      if (idx !== -1 && idx < history.length - 1) {
        return history[idx + 1];
      }
    }
    return value;
  }
}
function pushLast(history: string[], value: string) {
  const idx = history.indexOf(value);
  if (idx === -1) {
    history.splice(0, Math.max(0, history.length - 10));
  } else {
    history.splice(idx, 1);
  }
  history.push(value);

  return history;
}
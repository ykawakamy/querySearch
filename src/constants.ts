export namespace Constants {
  export const COMMAND_QUERYSEARCH_OPENFILE = "querySearch.openFile";
  export const COMMAND_QUERYSEARCH_PREVIEWFILE = "querySearch.previewFile";
  export const COMMAND_QUERYSEARCH_REPLACE = "querySearch.replace";
  export const COMMAND_QUERYSEARCH_REPLACEALL = "querySearch.replaceAll";
  export const COMMAND_QUERYSEARCH_REPLACEFILES = "querySearch.replaceFiles";
  export const COMMAND_QUERYSEARCH_COPY_RESULT = "querySearch.copyResult";
  //--
  export const VIEW_ID_SEARCHRESULT = "searchResult";
  export const VIEW_ID_QUERY = "querySearch";

  export const SCHEMA = "querysearch";
  export const SCHEMA_PREVIEW = "querysearch-preview";
}
//--
export enum ContextValues {
  result = "querySearch.result",
  file = "querySearch.file",
  replaceResult = "querySearch.replaceResult",
  replaceFile = "querySearch.replaceFile",
}
//--
export enum State {
  latestQuery = "querySerach.latestQuery",
  latestReplaceContext = "querySerach.latestReplaceContext",
}

export interface ExecuteMode {
    file: ContextValues,
    item: ContextValues,
}

export const ExecuteModes = {
  search: { file: ContextValues.file, item: ContextValues.result },
  replace: { file: ContextValues.replaceFile, item: ContextValues.replaceResult },
};

export namespace Constants{
    export const COMMAND_QUERYSEARCH_OPENFILE=  "querySearch.openFile";
    export const COMMAND_QUERYSEARCH_REPLACE=  "querySearch.replace";
    export const COMMAND_QUERYSEARCH_REPLACEALL=  "querySearch.replaceAll";
    export const COMMAND_QUERYSEARCH_REPLACEFILES=  "querySearch.replaceFiles";
    export const COMMAND_QUERYSEARCH_COPY_RESULT=  "querySearch.copyResult";
    //--
    export const CONTEXT_VALUE : Record<string, string>= {
        RESULT: "querySearch.result",
        FILE: "querySearch.file",
    } as const;
    //--
    export const VIEW_ID_SEARCHRESULT = "searchResult";
    export const VIEW_ID_QUERY = "querySearch";
    //--
    export const STATE = {
        LATEST_QUERY : "querySerach.latestQuery",
        LATEST_REPLACE_EXPRESSION : "querySerach.latestReplaceExpr",
    };

    export const SCHEMA = "querysearch";
    export const SCHEMA_PREVIEW = "querysearch-preview";
}
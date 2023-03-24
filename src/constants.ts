export namespace Constants{
    export const COMMAND_QUERYSEARCH_OPENFILE=  "querySearch.openFile";
    export const COMMAND_QUERYSEARCH_REPLACE=  "querySearch.replace";
    export const COMMAND_QUERYSEARCH_REPLACEALL=  "querySearch.replaceAll";
    export const COMMAND_QUERYSEARCH_REPLACEFILES=  "querySearch.replaceFiles";
    export const CONTEXT_VALUE = {
        RESULT: "querySearch.result",
        FILE: "querySearch.file",
    } as const;
    export const VIEW_ID_SEARCHRESULT = "searchResult";
    export const VIEW_ID_QUERY = "querySearch";

    
}
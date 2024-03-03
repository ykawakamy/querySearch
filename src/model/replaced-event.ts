import { SearchResult } from "./search-result.model";
import * as vscode from "vscode";

export class ReplacedEvent {
  constructor( public uri: vscode.Uri, public index: number, public newResult : SearchResult | null){}
}

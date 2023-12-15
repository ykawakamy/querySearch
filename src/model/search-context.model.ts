import { IPHtmlElement, IPHtmlNode } from "html-parser/dist/interface";
import * as ts from "typescript";
import { Constants } from "../constants";

export type QSNode = IPHtmlNode | IPHtmlElement;

export type SearchContext = {
  search: string;
  replace?: string;
  replaceToggle?: boolean;
  filterToggle?: boolean;
  includes?: string;
  excludes?: string;
};


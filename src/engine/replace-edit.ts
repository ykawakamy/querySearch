import { Node } from "node-html-parser";
import { TextDecoder } from "util";
import * as vscode from "vscode";
import { Range } from "vscode";

export type ReplaceDocument =
  | vscode.TextDocument
  | { uri: vscode.Uri; getText(range?: Range): string };

type ReplaceOffset = readonly [number, number];

interface EditRecord {}

export interface ReplaceEdit {
  openTextDocument(uri: vscode.Uri): Thenable<ReplaceDocument>;
  replace(
    uri: vscode.Uri,
    range: ReplaceOffset,
    newText: string
  ): Thenable<void>;
  applyEdit(): Thenable<void>;
  modifiedTextDocument(uri: vscode.Uri): Thenable<ReplaceDocument>;
}

export class ReplaceEditTextDocument implements ReplaceEdit {
  private edit = new vscode.WorkspaceEdit();

  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    return vscode.workspace.openTextDocument(uri!);
  }
  async replace(
    uri: vscode.Uri,
    range: ReplaceOffset,
    newText: string
  ): Promise<void> {
    const document = await this.openTextDocument(uri);
    const vsrange = new vscode.Range(
      document.positionAt(range[0]),
      document.positionAt(range[1])
    );
    this.edit.replace(uri, vsrange, newText);
  }
  async applyEdit(): Promise<void> {
    await vscode.workspace.applyEdit(this.edit);
  }

  async modifiedTextDocument(uri: vscode.Uri): Promise<ReplaceDocument> {
    return vscode.workspace.openTextDocument(uri!);
  }
}

export class ReplaceEditInMemory implements ReplaceEdit {
  cache: Map<string, string> = new Map();
  offset: Map<string, number> = new Map();

  async openTextDocument(uri: vscode.Uri): Promise<ReplaceDocument> {
    const content = (await vscode.workspace.openTextDocument(uri!)).getText();
    
    this.cache.set(uri.path, content);
    this.offset.set(uri.path, 0);
    return { uri: uri, getText: () => this.cache.get(uri.path)! };
  }
  async replace(
    uri: vscode.Uri,
    range: ReplaceOffset,
    newText: string
  ): Promise<void> {
    let content = this.cache.get(uri.path)!;
    let offset = this.offset.get(uri.path)!;
    content =
      content.substring(0, range[0] - offset) +
      newText +
      content.substring(range[1] - offset);
    offset += range[1] - range[0] - newText.length;
    this.cache.set(uri.path, content);
    this.offset.set(uri.path, offset);
  }
  async applyEdit(): Promise<void> {}

  async modifiedTextDocument(uri: vscode.Uri): Promise<ReplaceDocument> {
    return { uri: uri, getText: () => this.cache.get(uri.path)! };
  }
}

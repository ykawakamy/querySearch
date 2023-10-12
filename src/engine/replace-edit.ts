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
  document: any;

  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    if(!this.document){
      this.document = vscode.workspace.openTextDocument(uri!);
    }
    return this.document;
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
    const result = await vscode.workspace.applyEdit(this.edit);
    if( !result ){
      throw new Error("cannot applyEdit.");
    } 
  }

  async modifiedTextDocument(uri: vscode.Uri): Promise<ReplaceDocument> {
    return this.document;
  }
}

/**
 * ReplaceEditInMemory
 *
 * NOTE: {@link vscode.workspace.openTextDocument | openTextDocument} has a problem with displaying tabs.
 */
export class ReplaceEditInMemory implements ReplaceEdit {
  content!: string;
  offset: number = 0;

  async openTextDocument(uri: vscode.Uri): Promise<ReplaceDocument> {
    if(! this.content){
      this.content = (await vscode.workspace.openTextDocument(uri!)).getText();
    } 

    return { uri: uri, getText: () => this.content! };
  }
  async replace(
    uri: vscode.Uri,
    range: ReplaceOffset,
    newText: string
  ): Promise<void> {
    let content = this.content;
    let offset = this.offset;
    content =
      content.substring(0, range[0] - offset) +
      newText +
      content.substring(range[1] - offset);
    offset += range[1] - range[0] - newText.length;
    this.content = content;
    this.offset = offset;
  }
  async applyEdit(): Promise<void> {}

  async modifiedTextDocument(uri: vscode.Uri): Promise<ReplaceDocument> {
    return { uri: uri, getText: () => this.content };
  }
}

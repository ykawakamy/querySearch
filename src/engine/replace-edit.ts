import * as l10n from "@vscode/l10n";
import * as vscode from "vscode";
import { Range } from "vscode";

type ReplaceOffset = readonly [number, number];

interface EditRecord {}

export interface ReplaceEdit {
  openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
  replace(
    uri: vscode.Uri,
    range: ReplaceOffset,
    newText: string
  ): Thenable<void>;
  applyEdit(): Thenable<void>;
}

export class ReplaceEditTextDocument implements ReplaceEdit {
  protected edit = new vscode.WorkspaceEdit();
  documents: Record<string,vscode.TextDocument> = {};

  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    if(this.documents[uri.fsPath]){
      return this.documents[uri.fsPath];
    }
    const document = await vscode.workspace.openTextDocument(uri!);
    this.documents[uri.fsPath] = document;
    return document;
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
    this.edit.replace(document.uri, vsrange, newText);
  }
  async applyEdit(): Promise<void> {
    if(this.edit.size === 0){
      return;
    }
    const result = await vscode.workspace.applyEdit(this.edit);
    if( !result ){
      throw new Error(vscode.l10n.t("cannot applyEdit."));
    }
    for( const document of Object.values(this.documents)){
      await document.save();
    }
  }
}

export class ReplaceEditMemFsTextDocument extends ReplaceEditTextDocument {
  documents: Record<string,vscode.TextDocument> = {};

  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    if(this.documents[uri.fsPath]){
      return this.documents[uri.fsPath];
    }
    const memUri = vscode.Uri.from({scheme: "memfs", path: uri.path, fragment: uri.scheme });
    const document = await vscode.workspace.openTextDocument(memUri);
    this.documents[uri.fsPath] = document;
    // XXX workaround reload
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(
      document.lineAt(0).range.start,
      document.lineAt(document.lineCount - 1).range.end
    );
    const rawText = await vscode.workspace.fs.readFile(vscode.Uri.from({scheme: uri.fragment, path: uri.path}));
    edit.replace(document.uri, range, rawText.toString());
    await vscode.workspace.applyEdit(edit);

    return document;
  }

  async applyEdit(): Promise<void> {
    if(this.edit.size === 0){
      return;
    }
    const result = await vscode.workspace.applyEdit(this.edit, {isRefactoring: true});
    if( !result ){
      throw new Error(vscode.l10n.t("cannot applyEdit."));
    } 
  }
}

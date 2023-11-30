import * as  l10n from "@vscode/l10n";
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
  modifiedTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
}

export class ReplaceEditTextDocument implements ReplaceEdit {
  protected edit = new vscode.WorkspaceEdit();
  document!: vscode.TextDocument;

  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    if(!this.document){
      this.document = await vscode.workspace.openTextDocument(uri!);
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
    if(this.edit.size === 0){
      return;
    }
    const result = await vscode.workspace.applyEdit(this.edit);
    if( !result ){
      throw new Error(vscode.l10n.t("cannot applyEdit."));
    } 
    await this.document.save();
  }

  async modifiedTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    return this.document;
  }
}

export class ReplaceEditMemFsTextDocument extends ReplaceEditTextDocument {
  document!: vscode.TextDocument;

  async openTextDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
    if(!this.document){
      const memUri = vscode.Uri.from({scheme: "memfs", path: uri.path, fragment: uri.scheme });
      const document = await vscode.workspace.openTextDocument(memUri);

      // XXX workaround reload
      const edit = new vscode.WorkspaceEdit();
      const range = new vscode.Range(
        document.lineAt(0).range.start,
        document.lineAt(document.lineCount - 1).range.end
      );
      const rawText = await vscode.workspace.fs.readFile(vscode.Uri.from({scheme: uri.fragment, path: uri.path}));
      edit.replace(document.uri, range, rawText.toString());
      const result = await vscode.workspace.applyEdit(edit);
      this.document = document;
    }
    return this.document;
  }

  async applyEdit(): Promise<void> {
    if(this.edit.size === 0){
      return;
    }
    const result = await vscode.workspace.applyEdit(this.edit);
    if( !result ){
      throw new Error(vscode.l10n.t("cannot applyEdit."));
    } 
  }
}

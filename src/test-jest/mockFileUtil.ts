import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as vscode from "vscode";

export class Mockfile {
  constructor(private appPrefix = "test_") {
  }

  async createDocument(arg: {content:string}){
    const document:vscode.TextDocument = {
      getText: ()=>arg.content,
    } as vscode.TextDocument;
    return document;
  }
  cleanup(){
  }
}


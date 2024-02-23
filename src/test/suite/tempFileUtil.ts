import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as vscode from "vscode";

export class Tempfile {
  files: string[] = [];
  documents: vscode.TextDocument[] = [];
  tmpDir: string;
  constructor(private appPrefix = "test_") {
    this.tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), this.appPrefix + currentDateStr())
    );
  }

  createTempFile(content:string, prefix = "", suffix = ".txt") {
    const tmpFile = prefix + currentDateStr() + suffix;
    this.files.push(tmpFile);
    const tempPath = path.resolve(this.tmpDir, tmpFile);
    let no = 0;
    while(fs.existsSync(tempPath+no)){
      no++;
    }
    fs.writeFileSync(tempPath+no, content, {encoding:"utf8"} );
    return tempPath+no;
  }

  async createDocument(arg: {content:string}){
    const filePath = this.createTempFile(arg.content);
    const document = await vscode.workspace.openTextDocument(filePath);
    this.documents.push(document);
    return document;
  }
  cleanup(){
    fs.rm(this.tmpDir,{recursive:true, retryDelay:1000, maxRetries:5}, ()=>{});
  }
}

function currentDateStr() {
  return formatDate(new Date(), "yyyymmdd_HHmmss_SSS");
}

function formatDate(date: Date, format: string) {
  format = format.replace(/yyyy/g, "000" + date.getFullYear());
  format = format.replace(/MM/g, ("0" + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/dd/g, ("0" + date.getDate()).slice(-2));
  format = format.replace(/HH/g, ("0" + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ("0" + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ("0" + date.getSeconds()).slice(-2));
  format = format.replace(/SSS/g, ("00" + date.getMilliseconds()).slice(-3));
  return format;
}

import * as  l10n from "@vscode/l10n";

declare const bundleUri: string;

export async function l10nInitalize(){
  if(bundleUri){
    await l10n.config({
      uri: bundleUri
    });
  }
}
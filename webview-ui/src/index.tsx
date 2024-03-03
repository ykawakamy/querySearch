import React from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import QueryArea from "./query-area";
import { l10nInitalize } from "./utilities/l10n";

const container = document.getElementById('root')!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript

l10nInitalize().then(()=>{},(e)=>{console.log(e);}).finally(()=>{
  root.render(<QueryArea/>);
});
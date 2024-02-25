import React from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import QueryArea from "./query-area";

const container = document.getElementById('root')!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<QueryArea/>);
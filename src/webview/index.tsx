import ReactDOM from "react-dom/client";
import QueryArea from "./query-area";
import { l10nInitalize } from "./utilities/l10n";

const container = document.getElementById('root')!;
const root = ReactDOM.createRoot(container);

l10nInitalize().then(()=>{},(e)=>{console.log(e);}).finally(()=>{
  root.render(<QueryArea/>);
});
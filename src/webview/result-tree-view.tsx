import { 
  provideFASTDesignSystem, 
  fastCard, 
  fastButton,
  fastTreeView,
  fastTreeItem
} from '@microsoft/fast-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useEffect, useState } from 'react';
import { SearchResult } from '../model/search-result.model';

const { wrap } = provideReactWrapper(
  React, 
  provideFASTDesignSystem()
);

export const FastTreeView = wrap(fastTreeView());
export const FastTreeItem = wrap(fastTreeItem());
export const FastButton = wrap(fastButton());

export function ResultTreeView() {
  const [list, setList] = useState<SearchResult[]>([]);
  useEffect( ()=>{
    function handler(e: MessageEvent){
      let message = e.data;
      if(message.type === 'setList'){
        setList(message.list);
      }
    }
    window.addEventListener("message", handler);
    return ()=>window.removeEventListener("message", handler);

  });
  return (
    <FastTreeView>
      {
        list.map((x)=>{
          return <ResultTreeItem item={x}></ResultTreeItem>;
        })
      }
    </FastTreeView>
  );
}

export function ResultTreeItem( props: { item: SearchResult}){
  const [list, setList] = useState<any[]>(props.item.items);
  return (
    <FastTreeItem>
      {
        list.map((x)=>{
          return <ResultTreeItem item={x}></ResultTreeItem>;
        })
      }
    </FastTreeItem>
  );
}
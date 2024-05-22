import React, { useContext } from 'react';
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";
import Woolf from './Woolf';
import { parseGraphObject } from '../utils/query';

const TokenList = ({ title, active, items, selected, toggleSelected, stats }) => {

  const isItemSelected = (id) => selected.some(el => el.id === id);

  const handleClick = (item) => {
    if (!active) return;
    toggleSelected(item, !isItemSelected(item.id));
  };

  const LeftArrow = () => {
    const { scrollPrev, isFirstItemVisible } = useContext(VisibilityContext);

    return (
      <div
        className="relative cursor-pointer"
        onClick={() => scrollPrev()}
      >
        <img
          src="/images/arrow-left.svg"
          alt="previous"
          style={{
            opacity: isFirstItemVisible ? 0.5 : 1,
            height: '100%',
            marginRight: '5px'
          }}
        />
      </div>
    );
  };

  const RightArrow = () => {
    const { scrollNext, isLastItemVisible } = useContext(VisibilityContext);

    return (
      <div
        className="relative cursor-pointer"
        onClick={() => scrollNext()}
      >
        <img
          src="/images/arrow-right.svg"
          alt="next"
          style={{
            opacity: isLastItemVisible ? 0.5 : 1,
            height: '100%',
            marginLeft: '5px'
          }}
        />
      </div>
    );
  };

  return (
    <div className="w-full border-4 border-r border-t-0 border-r-0 p-2" style={{ borderColor: 'rgba(42,35,30,1.0)', opacity: active ? 1 : 0.5 }}>
      <div className="text-red font-console">
        {title}
      </div>
      {items.length > 0 ? (
        <ScrollMenu LeftArrow={LeftArrow} RightArrow={RightArrow}>
          {items.map((item) => (
            <Woolf
              woolf={parseGraphObject(item)}
              itemId={item.id}
              title={item.id}
              key={item.id}
              onClick={() => handleClick(item)}
              selected={isItemSelected(item.id)}
              stats={stats}
            />
          ))}
        </ScrollMenu>
      ) : (
        <div className="text-red font-console text-xs">
          No Tokens
        </div>
      )}
    </div>
  );
};

export default TokenList;

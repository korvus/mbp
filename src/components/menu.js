import React, { Fragment, useContext } from 'react';
import boulangeries from '../datas/datas.json';
import { PinContext, Text } from '../store';


const listDate = Object.keys(boulangeries);


const ListByYears = (props) => {
  const [pins, setPins] = props.actions;

  const years = [];
  for (const [index, value] of listDate.entries()) {
    years.push(
      <li 
        className={pins === value ? "active" : ""}
        key={index}
        onClick={() => setPins(value)}>
          {value}
          <sup 
            className={'small'}
            title={'Nombre de boulangeries référencées dans le palmarés'}
          >
            {boulangeries[listDate[index]].length}
          </sup>
        </li>
      );
  }
  return <Fragment>{years}</Fragment>;
}

const Col = () => {
  const {pins, setPins} = useContext(PinContext);

  return (
    <div className="pannel">
      <h1><Text tid="titre" /></h1>
      <ul>
        <li className={pins === 0 ? "active" : ""} onClick={() => setPins(0)}><Text tid="tous" /></li>
        <ListByYears actions={[pins, setPins]} />
      </ul>
    </div>
  );
}

export default Col;
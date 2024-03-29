import React, { Fragment, useContext } from "react";
import boulangeries from "../datas/datas.json";
import { PinContext, Text, FuncText } from "../store";

const listDate = Object.keys(boulangeries);

const ListByYears = (props) => {
  const [pins, setPins] = props.actions;

  const years = [];
  for (const [index, value] of listDate.entries()) {
    years.push(
      <li
        className={pins === value ? "active" : ""}
        key={index}
        onClick={() => setPins(value)}
      >
        {value}
        <sup
          className={"small"}
          title={"Nombre de boulangeries référencées dans le palmarés"}
        >
          {boulangeries[listDate[index]].length}
        </sup>
      </li>
    );
  }
  return <Fragment>{years}</Fragment>;
};

const Col = () => {
  const { pins, rankselected, setPins, setRankselected } = useContext(PinContext);

  return (
    <div className="pannel">
      <h1>
        <Text tid="titre" />
      </h1>
      <ul className={`rank ${pins !== 0 ? ' inactive' : ''}`}>
        <li
          onClick={() => setRankselected(0)}
          title={FuncText("displayAll")}
          className={`all ${rankselected === 0 && 'active'}`}
        ></li>
        <li
          onClick={() => setRankselected(1)}
          title={FuncText("displayGold")}
          className={`gold ${rankselected === 1 ? 'active' : ''}`}
        ></li>
        <li
          onClick={() => setRankselected(2)}
          title={FuncText("displaySilver")}
          className={`silver ${rankselected === 2 ? 'active' : ''}`}
        ></li>
        <li
          onClick={() => setRankselected(3)}
          title={FuncText("displayThird")}
          className={`bronze ${rankselected === 3 ? 'active' : ''}`}
        ></li>

      </ul>
      <ul className="years">
        <li className={pins === 0 ? "active" : ""} onClick={() => setPins(0)}>
          <Text tid="tous" />
        </li>
        <ListByYears actions={[pins, setPins]} />
      </ul>
    </div>
  );
};

export default Col;

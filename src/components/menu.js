import React, { Fragment, useContext } from 'react';
import boulangeries from '../datas/datas.json';
import { PinContext, Text } from '../store';

import Pavlova from "../img/pavlova.png";
import viennoiserie from "../img/croissant.png";
import babka from "../img/babka.png";
import brioche from "../img/brioche.png";
import choux from "../img/choux.png";
import churros from "../img/churros.png";
import cookies from "../img/cookies.png";
import eclairs from "../img/eclairs.png";
import kouignaman from "../img/kouignaman.png";
import chausson from "../img/chausson.png";
import madeleine from "../img/madeleine.png";
import painChocolat from "../img/painChocolat.png";
import cheesecake from "../img/cheesecake.png";
import montblanc from "../img/montblanc.png";
import galette from "../img/galette.png";
import macaron from "../img/macaron.png";
import medovic from "../img/medovic.png";
import cinnamon from "../img/cinnamon.png";
import parisBrest from "../img/parisBrest.png";
import stHonore from "../img/st-honore.png";
import tartes from "../img/tartes.png";
import merveilleux from "../img/merveilleux.png";
import oriental from "../img/oriental.png";
import flan from "../img/flan.png";
import millefeuilles from "../img/millefeuilles.png";
import glace from "../img/glace.png";

const listDate = Object.keys(boulangeries);


const ListByYears = (props) => {
  const [pins, setPins] = props.actions;

  const years = [];
  for (const [index, value] of listDate.entries()) {

    let pic = <img src=""  alt="" />
    if(value === "pavlova") pic = <img alt={value} src={Pavlova} title={value} />
    if(value === "macarons") pic = <img alt={value} src={macaron} title={value} />
    if(value === "tartes") pic = <img alt={value} src={tartes} title={value} />
    if(value === "viennoiseries") pic = <img alt={value} src={viennoiserie} title={value} />
    if(value === "Saint-honoré") pic = <img alt={value} src={stHonore} title={value} />
    if(value === "Paris-Brest") pic = <img alt={value} src={parisBrest} title={value} />
    if(value === "médovik") pic = <img alt={value} src={medovic} title={value} />
    if(value === "Cinnamon roll") pic = <img alt={value} src={cinnamon} title={value} />
    if(value === "Madeleine") pic = <img alt={value} src={madeleine} title={value} />
    if(value === "Pain au chocolat") pic = <img alt={value} src={painChocolat} title={value} />
    if(value === "éclairs") pic = <img alt={value} src={eclairs} title={value} />
    if(value === "galettes des rois") pic = <img alt={value} src={galette} title={value} />
    if(value === "cookies") pic = <img alt={value} src={cookies} title={value} />
    if(value === "Kouign amann") pic = <img alt={value} src={kouignaman} title={value} />
    if(value === "Mont blanc") pic = <img alt={value} src={montblanc} title={value} />
    if(value === "Chausson aux pommes") pic = <img alt={value} src={chausson} title={value} />
    if(value === "Cheesecake") pic = <img alt={value} src={cheesecake} title={value} />
    if(value === "churros") pic = <img alt={value} src={churros} title={value} />
    if(value === "choux à la crème") pic = <img alt={value} src={choux} title={value} />
    if(value === "brioche") pic = <img alt={value} src={brioche} title={value} />
    if(value === "babka") pic = <img alt={value} src={babka} title={value} />
    if(value === "merveilleux") pic = <img alt={value} src={merveilleux} title={value} />
    if(value === "oriental") pic = <img alt={value} src={oriental} title={value} />
    if(value === "flan") pic = <img alt={value} src={flan} title={value} />
    if(value === "mille-feuilles") pic = <img alt={value} src={millefeuilles} title={value} />
    if(value === "glaçe") pic = <img alt={value} src={glace} title={value} />
    if(value === "Autre") pic = <Text tid="autre" />

    years.push(
      <li 
        className={pins === value ? "active" : ""}
        key={index}
        onClick={() => setPins(value)}>
          {pic}
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
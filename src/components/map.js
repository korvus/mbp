import { MapContainer, TileLayer, useMap, useMapEvent, Marker, Popup } from 'react-leaflet';
import React, { Fragment, useContext, useEffect } from 'react';
import coords from '../datas/datas.json';
import { IconGold, IconSilver, IconDefault } from '../components/icon.js';
import { PinContext } from '../store';
import Modalcontent from './modal.js';
import Warningcontent from './warning.js';

const listDate = Object.keys(coords);

const Paris = [48.853381,2.348367];

function transformForGgl(chaine) {
  chaine.replace(' ', '+');
  chaine = `${chaine}+paris`;
  return chaine;
}

function loopOnAllMarkers(boulangeries){
    for (const [index, value] of listDate.entries()) {
        for(let a=0; a<coords[listDate[index]].length; a++){
            let idCoords = JSON.stringify(coords[listDate[index]][a].coords);
            let valid = coords[listDate[index]][a].valid !== undefined ? coords[listDate[index]][a].valid : true;
            let titre = a === 0 ? [`Meilleurs baguette ${value}`] : [`Finaliste année ${value}`];
            if(!boulangeries.hasOwnProperty(idCoords)){
                boulangeries[idCoords] = {
                    "popup": [titre],
                    "rank": a,
                    "obsolete": !valid,
                    "name": coords[listDate[index]][a].name,
                    "adresse": coords[listDate[index]][a].adresse,
                    "coords": coords[listDate[index]][a].coords
                }
            } else {
                boulangeries[idCoords].popup.push(titre);
                if(a < boulangeries[idCoords].rank){
                    boulangeries[idCoords].rank = a;
                }
            }
        }
    }
    return boulangeries;
}

function loopForOneMarker(boulangeries, year){
    // for (const [index, value] of listDate.entries()) {
        for(let a=0; a<coords[year].length; a++){
            let idCoords = JSON.stringify(coords[year][a].coords);
            let titre = a === 0 ? [`Meilleurs baguette ${year}`] : [`Finaliste année ${year}`];
            if(!boulangeries.hasOwnProperty(idCoords)){
                boulangeries[idCoords] = {"popup": [titre], "rank": a, "name": coords[year][a].name, "adresse": coords[year][a].adresse, "coords": coords[year][a].coords}
            } else {
                boulangeries[idCoords].popup.push(titre);
                if(a < boulangeries[idCoords].rank){
                    boulangeries[idCoords].rank = a;
                }
            }
        }
    // }
    return boulangeries;
}

function constructJsx(boulangeries, map){
    const jsxElements = [];
    let i = 0;
    let shouldBeOneAtLeast = 0;
    for (var boulangerie in boulangeries) {
  
      const trophies = [];
      for(const [index, value] of boulangeries[boulangerie].popup.entries()) {
        trophies.push(<span key={index}>{value}</span>);
      }
  
      const forUrl = transformForGgl(boulangeries[boulangerie].adresse);
  
      if(boulangeries.hasOwnProperty(boulangerie)){
        let icone = IconDefault;
        let toppest = boulangeries[boulangerie].rank;
        if(toppest === 0) icone = IconGold
        if(toppest === 1) icone = IconSilver

        if(map.getBounds().contains(boulangeries[boulangerie].coords)){shouldBeOneAtLeast++};

        jsxElements.push(
          <Marker 
            key={i}
            position={boulangeries[boulangerie].coords}
            icon={icone}
          >
            <Popup>
                {boulangeries[boulangerie].obsolete === true && <strong className="unexistant">N'existe plus</strong>}
              {trophies}
              <strong>{boulangeries[boulangerie].name}</strong>
                <address>
                    <a 
                        rel="noreferrer"
                        target="_blank"
                        href={`https://www.google.fr/maps/place/${forUrl}`}>
                            {boulangeries[boulangerie].adresse}
                    </a>
                </address>  
            </Popup>
          </Marker>
        )
      }
      i++;
    }
    return [jsxElements, shouldBeOneAtLeast]
}

function ListMarkers(props) {

    const map = useMap();
    const setWarn = props.warning;

    let boulangeries = {};
    if(props.list === 0){
        boulangeries = loopOnAllMarkers(boulangeries);
    } else {
        boulangeries = loopForOneMarker(boulangeries, props.list);
    }
  
    let arrBoulangeries = constructJsx(boulangeries, map);
  
    useEffect(() => {
        if(arrBoulangeries[1] === 0){
            setWarn(true);
        } else {
            setWarn(false);
        }
    });

    useMapEvent('drag', () => {
        let arrBoulangeries = constructJsx(boulangeries, map);
        if(arrBoulangeries[1] === 0){
            props.warning(true);
        } else {
            props.warning(false);
        }
    })

    useMapEvent('zoomend', () => {
        let arrBoulangeries = constructJsx(boulangeries, map);
        if(arrBoulangeries[1] === 0){
            props.warning(true);
        } else {
            props.warning(false);
        }
    })

    return (
      <Fragment>
        {arrBoulangeries[0]}
      </Fragment>
    )
}

const Map = () => {
    const {pins, dm, setDm, warning, setWarning} = useContext(PinContext);

    function escFunction(event){
        if(event.keyCode === 27) {
            if(dm){
                setDm(false);
                setWarning(false);
            }
        }
    }

    useEffect(() => {
        document.addEventListener("keydown", escFunction, false);    
    });

    return (
    <div className="App">
        {dm === true &&
            <div className={"modal"}>
                <Modalcontent />
            </div>
        }
        {warning === true &&
            <div className={"warning"}>
                <Warningcontent />
            </div>
        }
        <div
            className={"about"}
            title={"En savoir plus"}
            onClick={() => setDm(!dm)}
        >
            <span>?</span>
        </div>
        <MapContainer
            center={Paris}
            zoom={13}
            scrollWheelZoom={false}
            tap={false}
        > 
            <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ListMarkers list={pins} warning={setWarning} />
        </MapContainer>
    </div>
    )
}

export default Map;


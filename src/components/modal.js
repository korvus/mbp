import React, {useContext} from 'react';
import sources from '../datas/roots.json';
import LanguageSelector from './languageSelector';
import { PinContext, Text } from '../store';

function ListSources(){
    const listDate = Object.keys(sources);

    const sourcesByYear = [];
    for (const [index, value] of listDate.entries()) {
        sourcesByYear.push(<li key={index}><a rel="noreferrer" target="blank" href={sources[value]}>{value}</a></li>);
    }
    return sourcesByYear;
}

const Modalcontent = () => {
    const {setDm} = useContext(PinContext);
    return (
        <div className="innerModal">
            <div title="Echap" onClick={() => setDm(false)} className="close"></div>
            <LanguageSelector />
            <h2><Text tid="About" /></h2>
            <p>
                <Text tid="goalContent" />
                <a target="blank" rel="noreferrer" href="https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris">
                    <Text tid="contestwikipedia" />
                </a>,&nbsp;
                <Text tid="goalContentEnd" />
            </p>
            <h2><Text tid="sources" /></h2>
            <p>
                <Text tid="ranking" />
                <br />
                <Text tid="rankingByYear" />
                <br />
                <Text tid="helpWelcome" />&nbsp;
                <a href="mailto:ecrivez.moi@simonertel.net">ecrivez.moi@simonertel.net</a>
            </p>
            <ul>
                <ListSources />
            </ul>
            <h2>Contact & <Text tid="sourceCode" /></h2>
            <p>
                <Text tid="writeMe" />&nbsp;<a href="mailto:ecrivez.moi@simonertel.net">ecrivez.moi@simonertel.net</a>.&nbsp;
                <Text tid="sourceCodeAvailable" />&nbsp;<a rel="noreferrer" target="blank" href="https://github.com/korvus/mbp"><Text tid="ici" /></a>.
            </p>
            <h2><Text tid="divers" /></h2>
            <p>
                <Text tid="" /> <a target="blank" rel="noreferrer" href="https://patefolle.vercel.app/"><Text tid="app" /></a>.
            </p>
        </div>
    );
}

export default Modalcontent;
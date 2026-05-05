import React, { useContext } from 'react';
import sources from '../datas/roots.json';
import { PinContext, Text } from '../store';

function ListSources() {
    const listDate = Object.keys(sources);

    return listDate.map((year) => (
        <li key={year} className="about-modal__source-item">
            <a rel="noreferrer" target="blank" href={sources[year]}>
                {year}
            </a>
        </li>
    ));
}

const Modalcontent = () => {
    const { setDm } = useContext(PinContext);

    return (
        <div className="innerModal about-modal" onClick={(event) => event.stopPropagation()}>
            <div title="Echap" onClick={() => setDm(false)} className="close"></div>
            <div className="about-modal__hero">
                <p className="about-modal__kicker"><Text tid="aboutKicker" /></p>
                <h2><Text tid="About" /></h2>
                <p className="about-modal__lead"><Text tid="aboutIntroLead" /></p>
                <p><Text tid="aboutIntroBody" /></p>
                <p><Text tid="aboutIntroDetail" /></p>
                <p><Text tid="aboutSubjective" /></p>
                <p><Text tid="aboutCriteria" /></p>
                <p>
                    <Text tid="goalContent" />{' '}
                    <a target="blank" rel="noreferrer" href="https://fr.wikipedia.org/wiki/Concours_de_la_meilleure_baguette_de_Paris">
                        <Text tid="contestwikipedia" />
                    </a>,{' '}
                    <Text tid="goalContentEnd" />
                </p>
            </div>

            <div className="about-modal__facts">
                <div className="about-modal__fact">
                    <strong><Text tid="aboutFactSinceTitle" /></strong>
                    <span><Text tid="aboutFactSinceBody" /></span>
                </div>
                <div className="about-modal__fact">
                    <strong><Text tid="aboutFactYearTitle" /></strong>
                    <span><Text tid="aboutFactYearBody" /></span>
                </div>
                <div className="about-modal__fact">
                    <strong><Text tid="aboutFactParisTitle" /></strong>
                    <span><Text tid="aboutFactParisBody" /></span>
                </div>
            </div>

            <section className="about-modal__section">
                <h3><Text tid="aboutWhyTitle" /></h3>
                <p><Text tid="aboutWhyBody" /></p>
            </section>

            <section className="about-modal__section">
                <h3><Text tid="sources" /></h3>
                <p>
                    <Text tid="ranking" /> <Text tid="rankingByYear" />
                </p>
                <p>
                    <Text tid="helpWelcome" /> <a href="mailto:ecrivez.moi@simonertel.net">ecrivez.moi@simonertel.net</a>
                </p>
                <ul className="about-modal__sources">
                    <ListSources />
                </ul>
            </section>

            <section className="about-modal__section">
                <h3><Text tid="aboutContactTitle" /> & <Text tid="sourceCode" /></h3>
                <p>
                    <Text tid="writeMe" /> <a href="mailto:ecrivez.moi@simonertel.net">ecrivez.moi@simonertel.net</a>.
                    {' '}<Text tid="sourceCodeAvailable" /> <a rel="noreferrer" target="blank" href="https://github.com/korvus/mbp"><Text tid="ici" /></a>.
                </p>
            </section>

            <section className="about-modal__section">
                <h3><Text tid="divers" /></h3>
                <p>
                    <Text tid="aboutDiversIntro" />{' '}
                    <a target="blank" rel="noreferrer" href="https://patefolle.200.work/">
                        <Text tid="breadTool" />
                    </a>.
                </p>
            </section>
        </div>
    );
};

export default Modalcontent;

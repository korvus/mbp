import React, { useContext, useState } from 'react';
import boulangeries from '../datas/datas.json';
import sources from '../datas/roots.json';
import LanguageSelector from './languageSelector';
import { PinContext, Text } from '../store';

const DONATION_BUTTON_CONFIG = {
    color: '#178040',
    size: 'sm',
    borderRadius: 'md',
    recipientAddress: '0xbbb5052a25eEe56D0BEB0C7Ec995320F965d3137'
};

const DIVERS_LINKS = [
    {
        href: 'https://patefolle.200.work/',
        imageSrc: '/divers-screen1.png',
        titleKey: 'diversCardBreadTitle',
        descriptionKey: 'diversCardBreadDescription'
    },
    {
        href: 'https://boulangerieparisbio.200.work',
        imageSrc: '/divers-screen2.png',
        titleKey: 'diversCardBioTitle',
        descriptionKey: 'diversCardBioDescription'
    },
    {
        href: 'https://patisseriesparis.200.work/',
        imageSrc: '/divers-screen3.png',
        titleKey: 'diversCardPastryTitle',
        descriptionKey: 'diversCardPastryDescription'
    }
];

const latestYear = Object.keys(boulangeries)
    .map((year) => Number.parseInt(year, 10))
    .filter((year) => Number.isFinite(year))
    .sort((left, right) => right - left)[0];

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

function DonationButtonEmbed({ dictionary }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const donationUrl = `https://fundhog.bunnylabs.dev/${encodeURIComponent(DONATION_BUTTON_CONFIG.recipientAddress)}`;

    return (
        <>
            <div className="donationEmbed">
                <button
                    type="button"
                    className={`donationEmbed__button donationEmbed__button--${DONATION_BUTTON_CONFIG.size} donationEmbed__button--radius-${DONATION_BUTTON_CONFIG.borderRadius}`}
                    style={{ backgroundColor: DONATION_BUTTON_CONFIG.color }}
                    onClick={() => setIsModalOpen(true)}
                >
                    {dictionary.donationCryptoButton || 'M\'offrir un cafe avec ETH'}
                </button>
            </div>
            {isModalOpen && (
                <div
                    className="donationEmbed__overlay"
                    onClick={() => setIsModalOpen(false)}
                    role="presentation"
                >
                    <div
                        className="donationEmbed__dialog"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label={dictionary.donationCryptoButton || 'M\'offrir un cafe avec ETH'}
                    >
                        <button
                            type="button"
                            className="donationEmbed__close"
                            onClick={() => setIsModalOpen(false)}
                            aria-label={dictionary.donationClose || 'Fermer la fenetre de don'}
                        >
                            ×
                        </button>
                        <iframe
                            className="donationEmbed__iframe"
                            src={donationUrl}
                            title={dictionary.donationCryptoButton || 'M\'offrir un cafe avec ETH'}
                            loading="lazy"
                        />
                    </div>
                </div>
            )}
        </>
    );
}

function BuyMeACoffeeEmbed({ dictionary }) {
    return (
        <div className="donationEmbed donationEmbed--bmc">
            <a
                className="donationEmbed__button donationEmbed__button--sm donationEmbed__button--radius-md donationEmbed__button--link"
                href="https://buymeacoffee.com/ertelsimonu"
                target="_blank"
                rel="noreferrer"
                style={{ backgroundColor: '#178040' }}
            >
                {dictionary.donationClassicButton || 'M\'offrir un cafe avec une monnaie classique'}
            </a>
        </div>
    );
}

const DataTableIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="4" y="5" width="16" height="14" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 10h16M9 5v14M15 5v14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 13h.1M12 13h.1M17 13h.1M7 16h.1M12 16h.1M17 16h.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
);

function renderInlineRichText(body) {
    if (typeof body !== 'string' || body.indexOf('**') === -1) {
        return body;
    }

    return body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
    });
}

const Modalcontent = ({ onRequestWalkRoute }) => {
    const { setDm, setFactsOpen, setPins, setRankselected, dictionary } = useContext(PinContext);
    const handleRouteButtonClick = () => {
        setDm(false);
        if (onRequestWalkRoute) {
            onRequestWalkRoute();
        }
    };
    const handleFactsButtonClick = () => {
        setDm(false);
        setFactsOpen(true);
    };
    const handleMobileFactsCardClick = () => {
        if (typeof window === 'undefined') {
            return;
        }

        const isMobileLayout = window.innerWidth <= 768 || window.matchMedia('(orientation: portrait)').matches;
        if (isMobileLayout) {
            handleFactsButtonClick();
        }
    };
    const handleLatestYearMapClick = () => {
        if (latestYear) {
            setPins(String(latestYear));
        }
        setRankselected(0);
        setDm(false);
    };

    return (
        <div className="innerModal about-modal" onClick={(event) => event.stopPropagation()}>
            <div title="Echap" onClick={() => setDm(false)} className="close"></div>
            <div className="about-modal__languages">
                <LanguageSelector />
            </div>
            <div className="about-modal__hero">
                <h2><Text tid="aboutKicker" /></h2>
                <p className="about-modal__lead"><Text tid="aboutIntroLead" /></p>
                <div className="about-modal__route-cta about-modal__route-cta--desktop-primary">
                    <button
                        className="about-modal__route-button about-modal__route-button--desktop-primary"
                        onClick={handleRouteButtonClick}
                        type="button"
                    >
                        {dictionary.aboutRouteCta || 'Trouver la boulangerie la plus proche a pied'}
                    </button>
                </div>
                <div
                    className="about-modal__mobile-route-action"
                    style={{ '--mobile-route-image': "url('/mobile-screen-route.png')" }}
                >
                    <button
                        className="about-modal__route-button about-modal__route-button--mobile-inline"
                        onClick={handleRouteButtonClick}
                        type="button"
                    >
                        {dictionary.aboutRouteMobileCta || 'Trouver la meilleure boulangerie la plus proche de chez vous'}
                    </button>
                </div>
                <p>{renderInlineRichText(dictionary.aboutIntroBody || '')}</p>
                <div
                    className="about-modal__route-cta"
                    style={{ '--about-facts-block-image': "url('/background-block-datas.png')" }}
                    onClick={handleMobileFactsCardClick}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleMobileFactsCardClick();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                >
                    <button
                        className="about-modal__route-button about-modal__route-button--secondary"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleFactsButtonClick();
                        }}
                        type="button"
                    >
                        <span className="about-modal__button-icon">
                            <DataTableIcon />
                        </span>
                        {dictionary.aboutFactsCta || 'La baguette en chiffres'}
                    </button>
                </div>
                <p>{renderInlineRichText(dictionary.aboutIntroDetail || '')}</p>
                <div
                    className="about-modal__inline-cta"
                    style={{ '--about-laurel-image': "url('/lauriers-brown.svg')" }}
                >
                    <button
                        className="about-modal__route-button about-modal__route-button--secondary"
                        onClick={handleLatestYearMapClick}
                        type="button"
                    >
                        {(dictionary.aboutLatestYearMapCtaPrefix || 'Afficher la carte des laureats de ')}
                        {latestYear}
                    </button>
                </div>
                <p>{renderInlineRichText(dictionary.aboutCriteria || '')}</p>
                <p>
                    {renderInlineRichText(dictionary.goalContent || '')}{' '}
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
                    <Text tid="aboutDiversIntro" />
                </p>
                <div className="about-modal__promo-grid">
                    {DIVERS_LINKS.map((item) => (
                        <a
                            key={item.href}
                            className="about-modal__promo-card"
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <img className="about-modal__promo-image" src={item.imageSrc} alt="" />
                            <span className="about-modal__promo-copy">
                                <strong><Text tid={item.titleKey} /></strong>
                                <span><Text tid={item.descriptionKey} /></span>
                            </span>
                        </a>
                    ))}
                </div>
                <div className="about-modal__donation">
                    <p className="about-modal__donation-lead">
                        <Text tid="donationLead" />
                    </p>
                    <div className="about-modal__donation-actions">
                        <DonationButtonEmbed dictionary={dictionary} />
                        <BuyMeACoffeeEmbed dictionary={dictionary} />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Modalcontent;

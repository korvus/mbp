import React, { Fragment, useContext, useEffect, useMemo, useState } from "react";
import boulangeries from "../datas/datas.json";
import { PinContext, Text, FuncText, isReactSnap } from "../store";
import LanguageSelector from './languageSelector';
import promoImg from "../img/promo.png";

const listDate = Object.keys(boulangeries);
const yearCount = listDate.length;
const totalEntries = listDate.reduce((sum, year) => sum + boulangeries[year].length, 0);
const BAGUETTE_WEIGHT_GRAMS = 250;
const BAGUETTE_CALORIES = 700;
const BAGUETTES_PRODUCED_PER_YEAR_FRANCE = 6000000000;
const BAGUETTE_LENGTH_METERS = 0.55;
const BAGUETTE_VOLUME_LITERS = 0.72;
const EIFFEL_TOWER_WEIGHT_TONNES = 10100;
const BLUE_WHALE_WEIGHT_TONNES = 150;
const KHUFU_PYRAMID_VOLUME_M3 = 2400000;
const EARTH_CIRCUMFERENCE_KM = 40075;
const MOON_DISTANCE_KM = 384400;
const LIGHT_SPEED_KM_PER_SECOND = 299792;
const LIGHT_YEAR_KM = 9461000000000;
const LIVE_FACTS_ENDPOINT = '/api/insee.php';
const ARRONDISSEMENT_MAP_CENTER_Y = 48.858704465;
const ARRONDISSEMENT_MAP_VERTICAL_SCALE = 1.18;
const INITIAL_LIVE_FACTS = {
  bakeryCount: {
    status: 'loading',
    value: null
  },
  baguettePrice: {
    status: 'loading',
    value: null
  }
};

function normalizeBakeryText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,'"“”«»–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBakerySelectionKey(address = '') {
  return normalizeBakeryText(address);
}

function extractArrondissement(address = '') {
  const postalCodeMatch = address.match(/\b(75116|7500[1-9]|7501\d|75020)\b/);
  if (!postalCodeMatch) {
    return null;
  }

  const postalCode = postalCodeMatch[1];
  if (postalCode === '75116') {
    return 16;
  }

  return parseInt(postalCode.slice(3), 10);
}

const bakeryStatsMap = listDate.reduce((accumulator, year) => {
  boulangeries[year].forEach((entry, index) => {
    const bakeryKey = `${normalizeBakeryText(entry.name)}|${normalizeBakeryText(entry.adresse)}`;
    if (!accumulator.has(bakeryKey)) {
      accumulator.set(bakeryKey, {
        name: entry.name,
        adresse: entry.adresse,
        selectionKey: buildBakerySelectionKey(entry.adresse),
        total: 0,
        gold: 0
      });
    }

    const item = accumulator.get(bakeryKey);
    item.total += 1;
    if (index === 0) {
      item.gold += 1;
    }
  });

  return accumulator;
}, new Map());

const uniqueBakeries = bakeryStatsMap.size;
const topBakeries = [...bakeryStatsMap.values()]
  .sort((left, right) => right.total - left.total || right.gold - left.gold || left.name.localeCompare(right.name, 'fr'))
  .slice(0, 20);

const arrondissementStats = Array.from({ length: 20 }, (_, index) => ({
  arrondissement: index + 1,
  nominated: 0,
  gold: 0
}));

const arrondissementPolygons = [
  { arrondissement: 1, code: '75101', center: [2.335814765, 48.861928355], points: '2.344559181,48.8539929 2.332852283,48.85930633 2.320781394,48.86307866 2.325768441,48.86954617 2.327877417,48.86986381 2.350848136,48.86334445 2.350088494,48.86195533 2.344559181,48.8539929' },
  { arrondissement: 2, code: '75102', center: [2.34099579, 48.86698757], points: '2.350848136,48.86334445 2.327877417,48.86986381 2.347826239,48.87063069 2.354114163,48.8692798 2.350848136,48.86334445' },
  { arrondissement: 3, code: '75103', center: [2.359251924, 48.862509915], points: '2.368415354,48.85574003 2.350088494,48.86195533 2.350848136,48.86334445 2.354114163,48.8692798 2.363856759,48.86743437 2.368415354,48.85574003' },
  { arrondissement: 4, code: '75104', center: [2.356788706, 48.85406127], points: '2.364320761,48.84616721 2.344559181,48.8539929 2.350088494,48.86195533 2.368415354,48.85574003 2.369018231,48.85322503 2.364320761,48.84616721' },
  { arrondissement: 5, code: '75105', center: [2.351274472, 48.845414125], points: '2.365957645,48.8449078 2.351573383,48.83683535 2.342045196,48.83830325 2.336591299,48.83969413 2.344559181,48.8539929 2.364320761,48.84616721 2.365957645,48.8449078' },
  { arrondissement: 6, code: '75106', center: [2.330596354, 48.84950023], points: '2.336591299,48.83969413 2.324660773,48.84352162 2.316633528,48.84675871 2.329309954,48.85283817 2.332852283,48.85930633 2.344559181,48.8539929 2.336591299,48.83969413' },
  { arrondissement: 7, code: '75107', center: [2.311318005, 48.85511967], points: '2.316633528,48.84675871 2.307341121,48.84770357 2.289783728,48.85812315 2.3015562,48.86348063 2.320781394,48.86307866 2.332852283,48.85930633 2.329309954,48.85283817 2.316633528,48.84675871' },
  { arrondissement: 8, code: '75108', center: [2.311130293, 48.873281575], points: '2.320781394,48.86307866 2.3015562,48.86348063 2.295145331,48.87386648 2.301813413,48.87886991 2.327115255,48.88348449 2.325768441,48.86954617 2.320781394,48.86307866' },
  { arrondissement: 9, code: '75109', center: [2.337656874, 48.8765863], points: '2.325768441,48.86954617 2.327115255,48.88348449 2.349545307,48.88362643 2.347826239,48.87063069 2.327877417,48.86986381 2.325768441,48.86954617' },
  { arrondissement: 10, code: '75110', center: [2.362419443, 48.8758633], points: '2.363856759,48.86743437 2.354114163,48.8692798 2.347826239,48.87063069 2.349545307,48.88362643 2.364673565,48.88429223 2.369294401,48.8833274 2.377012647,48.87191932 2.363856759,48.86743437' },
  { arrondissement: 11, code: '75111', center: [2.381465134, 48.86000544], points: '2.399073509,48.84809156 2.369018231,48.85322503 2.368415354,48.85574003 2.363856759,48.86743437 2.377012647,48.87191932 2.399073509,48.84809156' },
  { arrondissement: 12, code: '75112', center: [2.415790164, 48.835787035], points: '2.461247497,48.81834904 2.436690798,48.81846971 2.42988222,48.82335702 2.419985644,48.82408288 2.403295661,48.8292441 2.390069238,48.82569681 2.365957645,48.8449078 2.364320761,48.84616721 2.369018231,48.85322503 2.399073509,48.84809156 2.415973775,48.84662837 2.413654005,48.83722773 2.416543512,48.83468767 2.423034714,48.84272345 2.427516512,48.84157582 2.447852027,48.84481015 2.467259567,48.83908833 2.465755861,48.82628372 2.461247497,48.81834904' },
  { arrondissement: 13, code: '75113', center: [2.366057217, 48.830332475], points: '2.343909438,48.81575715 2.342045196,48.83830325 2.351573383,48.83683535 2.365957645,48.8449078 2.390069238,48.82569681 2.364139036,48.81638808 2.356354375,48.8159597 2.352867224,48.81821631 2.343909438,48.81575715' },
  { arrondissement: 14, code: '75114', center: [2.322615122, 48.829639385], points: '2.343909438,48.81575715 2.331908932,48.81701279 2.314148424,48.82229055 2.301320806,48.82513029 2.324660773,48.84352162 2.336591299,48.83969413 2.342045196,48.83830325 2.343909438,48.81575715' },
  { arrondissement: 15, code: '75115', center: [2.293729516, 48.84162672], points: '2.301320806,48.82513029 2.289399238,48.82835178 2.280857988,48.83133163 2.27192834,48.82888526 2.267617156,48.83420125 2.262798259,48.83392881 2.289783728,48.85812315 2.307341121,48.84770357 2.316633528,48.84675871 2.324660773,48.84352162 2.301320806,48.82513029' },
  { arrondissement: 16, code: '75116', center: [2.262890385, 48.85706067], points: '2.262798259,48.83392881 2.253560441,48.83685745 2.248055951,48.84632036 2.22422457,48.85351605 2.225677067,48.8594073 2.231736346,48.86906948 2.245698309,48.876461 2.255286342,48.87435361 2.259988953,48.88019253 2.279946531,48.8785785 2.295145331,48.87386648 2.3015562,48.86348063 2.289783728,48.85812315 2.262798259,48.83392881' },
  { arrondissement: 17, code: '75117', center: [2.30496489, 48.88751489], points: '2.295145331,48.87386648 2.279946531,48.8785785 2.284458221,48.88563837 2.303777114,48.894152 2.319884459,48.90045887 2.32998325,48.9011633 2.327115255,48.88348449 2.301813413,48.87886991 2.295145331,48.87386648' },
  { arrondissement: 18, code: '75118', center: [2.349194181, 48.892568135], points: '2.327115255,48.88348449 2.32998325,48.9011633 2.351872525,48.90152657 2.365853595,48.9016104 2.370286444,48.90165178 2.371273107,48.89563155 2.364673565,48.88429223 2.349545307,48.88362643 2.327115255,48.88348449' },
  { arrondissement: 19, code: '75119', center: [2.387684001, 48.88678555], points: '2.377012647,48.87191932 2.369294401,48.8833274 2.364673565,48.88429223 2.371273107,48.89563155 2.370286444,48.90165178 2.389444303,48.90115742 2.396499648,48.896193 2.398651171,48.88941398 2.40033933,48.88374772 2.410694437,48.87847513 2.377012647,48.87191932' },
  { arrondissement: 20, code: '75120', center: [2.396676182, 48.86255175], points: '2.415973775,48.84662837 2.399073509,48.84809156 2.377012647,48.87191932 2.410694437,48.87847513 2.413277246,48.87311881 2.415319163,48.85517799 2.416339717,48.84923827 2.415973775,48.84662837' }
];

listDate.forEach((year) => {
  boulangeries[year].forEach((entry, index) => {
    const arrondissement = extractArrondissement(entry.adresse);
    if (!arrondissement || arrondissement < 1 || arrondissement > 20) {
      return;
    }

    const item = arrondissementStats[arrondissement - 1];
    item.nominated += 1;
    if (index === 0) {
      item.gold += 1;
    }
  });
});

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
          title={"Nombre de boulangeries referencees dans le palmares"}
        >
          {boulangeries[listDate[index]].length}
        </sup>
      </li>
    );
  }
  return <Fragment>{years}</Fragment>;
};

const AdBanner = () => (
  <div className="ad-banner">
    <div className="ad-banner__content">
      <strong><Text tid="adHeadline" /></strong>
      <p className="ad-banner__tagline"><Text tid="adTagline" /></p>
      <a
        className="ad-banner__cta"
        href="https://simon.gallery/shop/T/venus-is-full-of-sweet/"
        target="_blank"
        rel="noreferrer"
      >
        <Text tid="adCta" />
      </a>
    </div>
    <img
      className="ad-banner__image"
      src={promoImg}
      alt="Illustration promotion T-shirt baguette"
    />
  </div>
);

const StatsIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 19.5h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path d="M7 17V11.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    <path d="M12 17V7.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    <path d="M17 17v-3.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
  </svg>
);

function getLiveFactBody(dictionary, fact, keyPrefix) {
  if (fact.status === 'loading') {
    return dictionary[`${keyPrefix}Loading`] || '';
  }

  if (fact.status === 'success') {
    return dictionary[`${keyPrefix}Body`] || '';
  }

  return dictionary[`${keyPrefix}Error`] || '';
}

function renderFactBody(body) {
  if (typeof body !== 'string' || body.indexOf('**') === -1) {
    return body;
  }

  return body.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function buildArrondissementFill(nominated, maxNominated) {
  const ratio = maxNominated > 0 ? nominated / maxNominated : 0;
  const alpha = 0.22 + (ratio * 0.58);

  return `rgba(184, 146, 123, ${alpha.toFixed(3)})`;
}

function stretchArrondissementY(value) {
  return ARRONDISSEMENT_MAP_CENTER_Y + ((value - ARRONDISSEMENT_MAP_CENTER_Y) * ARRONDISSEMENT_MAP_VERTICAL_SCALE);
}

function stretchArrondissementPoints(points) {
  return points.split(' ').map((point) => {
    const [x, y] = point.split(',').map(Number);

    return `${x},${stretchArrondissementY(y).toFixed(9)}`;
  }).join(' ');
}

function ArrondissementsMap({ arrondissementStats, dictionary, integerFormatter }) {
  const maxNominated = Math.max(...arrondissementStats.map((item) => item.nominated), 0);

  return (
    <div className="facts-modal__arrondissements-map-shell">
      <svg
        aria-label={dictionary.factsArrondissementsTitle || 'Paris by arrondissement'}
        className="facts-modal__arrondissements-map"
        preserveAspectRatio="xMidYMid meet"
        viewBox="2.22422457 48.81575715 0.243034997 0.0858946299999985"
      >
        <g transform="translate(0,48.90165178) scale(1,-1) translate(0,-48.81575715)">
          {arrondissementPolygons.map((shape) => {
            const stats = arrondissementStats[shape.arrondissement - 1];
            const [labelX, rawLabelY] = shape.center;
            const labelY = stretchArrondissementY(rawLabelY);
            const arrondissementLabel = `${shape.arrondissement}e`;
            const nominatedLabel = dictionary.factsNominatedColumn || 'Nominees';
            const goldLabel = dictionary.factsGoldColumn || 'Gold';

            return (
              <g className="facts-modal__arrondissement-shape" key={shape.code}>
                <polygon
                  points={stretchArrondissementPoints(shape.points)}
                  style={{ fill: buildArrondissementFill(stats.nominated, maxNominated) }}
                >
                  <title>{`${arrondissementLabel} • ${integerFormatter.format(stats.nominated)} ${nominatedLabel} • ${integerFormatter.format(stats.gold)} ${goldLabel}`}</title>
                </polygon>
                <g transform={`translate(${labelX} ${labelY}) scale(1 -1)`}>
                  <text
                    className="facts-modal__arrondissement-number"
                    textAnchor="middle"
                    x="0"
                    y="0"
                  >
                    {integerFormatter.format(stats.nominated)}
                  </text>
                  <text
                    className="facts-modal__arrondissement-label"
                    textAnchor="middle"
                    x="0"
                    y="0.0054"
                  >
                    {arrondissementLabel}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

const FactsModal = ({ liveFacts, onClose, onSelectBakery }) => {
  const { dictionary, userLanguage } = useContext(PinContext);
  const [converterValueKg, setConverterValueKg] = useState('1');
  const formatter = useMemo(() => new Intl.NumberFormat(userLanguage || 'fr', { maximumFractionDigits: 1 }), [userLanguage]);
  const integerFormatter = useMemo(() => new Intl.NumberFormat(userLanguage || 'fr', { maximumFractionDigits: 0 }), [userLanguage]);
  const priceFormatter = useMemo(() => new Intl.NumberFormat(userLanguage || 'fr', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [userLanguage]);
  const percentFormatter = useMemo(() => new Intl.NumberFormat(userLanguage || 'fr', { minimumFractionDigits: 5, maximumFractionDigits: 5 }), [userLanguage]);
  const parsedConverterValueKg = Number.parseFloat(converterValueKg);
  const normalizedConverterValueKg = Number.isFinite(parsedConverterValueKg) && parsedConverterValueKg >= 0 ? parsedConverterValueKg : 0;
  const baguetteEquivalent = normalizedConverterValueKg / (BAGUETTE_WEIGHT_GRAMS / 1000);
  const yearlyBaguetteLineKm = (BAGUETTES_PRODUCED_PER_YEAR_FRANCE * BAGUETTE_LENGTH_METERS) / 1000;
  const yearlyBaguetteEarthTours = yearlyBaguetteLineKm / EARTH_CIRCUMFERENCE_KM;
  const yearlyBaguetteMoonTrips = yearlyBaguetteLineKm / MOON_DISTANCE_KM;
  const yearlyBaguetteLightSeconds = yearlyBaguetteLineKm / LIGHT_SPEED_KM_PER_SECOND;
  const yearlyBaguetteLightYearPercent = (yearlyBaguetteLineKm / LIGHT_YEAR_KM) * 100;
  const yearlyBaguetteWeightTonnes = (BAGUETTES_PRODUCED_PER_YEAR_FRANCE * BAGUETTE_WEIGHT_GRAMS) / 1000000;
  const yearlyBaguetteEiffelTowers = yearlyBaguetteWeightTonnes / EIFFEL_TOWER_WEIGHT_TONNES;
  const yearlyBaguetteBlueWhales = yearlyBaguetteWeightTonnes / BLUE_WHALE_WEIGHT_TONNES;
  const yearlyBaguetteVolumeM3 = (BAGUETTES_PRODUCED_PER_YEAR_FRANCE * BAGUETTE_VOLUME_LITERS) / 1000;
  const roundedYearlyBaguetteVolumeM3 = Math.round(yearlyBaguetteVolumeM3 / 100000) * 100000;
  const yearlyBaguetteKhufuPyramids = yearlyBaguetteVolumeM3 / KHUFU_PYRAMID_VOLUME_M3;
  const facts = useMemo(() => ([
    {
      size: 'square',
      tone: 'sand',
      value: `${integerFormatter.format(yearCount)} ${dictionary.factsYearsCountUnit || 'years'}`,
      label: dictionary.factsYearsCountLabel || 'Years listed',
      body: dictionary.factsYearsCountBody || 'The year count updates itself as soon as new editions are added to the dataset.'
    },
    {
      size: 'square',
      tone: 'stone',
      value: `${integerFormatter.format(totalEntries)}`,
      label: dictionary.factsEntriesLabel || 'Referenced entries',
      body: dictionary.factsEntriesBody || 'That is the total number of winners and finalists currently listed in the archive.'
    },
    {
      size: 'wide',
      tone: 'wheat',
      status: liveFacts.bakeryCount.status,
      value: liveFacts.bakeryCount.status === 'success'
        ? `${integerFormatter.format(liveFacts.bakeryCount.value)}`
        : null,
      label: dictionary.factsParisBakeriesLabel || 'Active bakeries in Paris',
      body: getLiveFactBody(dictionary, liveFacts.bakeryCount, 'factsParisBakeries')
    },
    {
      size: 'square',
      tone: 'dust',
      value: `${integerFormatter.format(uniqueBakeries)}`,
      label: dictionary.factsUniqueLabel || 'Different bakeries',
      body: dictionary.factsUniqueBody || 'Several addresses appear multiple times, which shows regularity across years.'
    },
    {
      size: 'wide',
      tone: 'cream',
      status: liveFacts.baguettePrice.status,
      value: liveFacts.baguettePrice.status === 'success'
        ? `${priceFormatter.format(liveFacts.baguettePrice.value)} €`
        : null,
      label: dictionary.factsBaguettePriceLabel || 'Average baguette price',
      body: getLiveFactBody(dictionary, liveFacts.baguettePrice, 'factsBaguettePrice')
    },
    {
      size: 'square',
      tone: 'sand',
      value: '50-55cm',
      label: dictionary.factsRulesLabel || 'Recent format',
      body: dictionary.factsRulesBody || 'Recent editions mention baguettes around 50 to 55cm and 250 to 270g.'
    },
    {
      size: 'wide',
      tone: 'clay',
      value: '4 000 EUR',
      label: dictionary.factsPrizeLabel || 'Winner prize',
      body: dictionary.factsPrizeBody || 'The winner receives a medal, a 4,000 euro prize, and supplies the Elysee for one year.'
    },
    {
      size: 'wide',
      tone: 'stone',
      value: `${integerFormatter.format(BAGUETTE_CALORIES)}kcal`,
      label: dictionary.factsCaloriesLabel || 'Calories in one baguette',
      body: dictionary.factsCaloriesBody || 'A traditional baguette of about 250g lands around 700kcal as a rough reference.'
    }
  ]), [dictionary, integerFormatter, liveFacts, priceFormatter]);

  return (
    <div className="modal" onClick={onClose}>
      <div className="innerModal facts-modal" onClick={(event) => event.stopPropagation()}>
        <div title="Echap" onClick={onClose} className="close"></div>
        <h2><Text tid="factsTitle" /></h2>
        <p className="facts-modal__intro"><Text tid="factsIntro" /></p>
          <div className="facts-modal__grid">
            {facts.map((fact) => (
	            <article
              className={`facts-modal__card facts-modal__card--${fact.size || 'square'} facts-modal__card--tone-${fact.tone || 'sand'}${fact.align ? ` facts-modal__card--align-${fact.align}` : ''}${fact.status === 'loading' ? ' facts-modal__card--loading' : ''}${fact.status === 'error' ? ' facts-modal__card--error' : ''}`}
	              key={fact.label}
	            >
	              <span className="facts-modal__label">{fact.label}</span>
	              {fact.status === 'loading' ? (
                <div className="facts-modal__loading" aria-live="polite">
                  <span className="facts-modal__spinner" aria-hidden="true"></span>
                </div>
              ) : (
                <strong className="facts-modal__value">{fact.value ?? '—'}</strong>
              )}
		              <p className="facts-modal__body">{renderFactBody(fact.body)}</p>
            </article>
          ))}
        </div>

        <section className="facts-modal__section">
          <h3><Text tid="factsTopBakeriesTitle" /></h3>
          <p><Text tid="factsTopBakeriesIntro" /></p>
          <div className="facts-modal__table-shell">
            <table className="facts-modal__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th><Text tid="factsBakeryColumn" /></th>
                  <th><Text tid="factsAwardsColumn" /></th>
                  <th><Text tid="factsGoldColumn" /></th>
                </tr>
              </thead>
              <tbody>
                {topBakeries.map((bakery, index) => (
                  <tr
                    className="facts-modal__table-row-button"
                    key={`${bakery.name}-${bakery.adresse}`}
                    onClick={() => onSelectBakery(bakery)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectBakery(bakery);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <strong>{bakery.name}</strong>
                      <span>{bakery.adresse}</span>
                    </td>
                    <td>{integerFormatter.format(bakery.total)}</td>
                    <td>{integerFormatter.format(bakery.gold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="facts-modal__section">
          <h3><Text tid="factsWeightTitle" /></h3>
          <p><Text tid="factsWeightIntro" /></p>
          <div className="facts-modal__weight-grid">
            <article className="facts-modal__card">
              <strong className="facts-modal__value">{integerFormatter.format(BAGUETTE_WEIGHT_GRAMS)}g</strong>
              <span className="facts-modal__label"><Text tid="factsWeightLabel" /></span>
              <p className="facts-modal__body">{renderFactBody(dictionary.factsWeightBody || 'For the joke, the converter assumes one baguette weighs about **250g**.')}</p>
            </article>
            <article className="facts-modal__card facts-modal__converter">
              <label className="facts-modal__converter-label" htmlFor="baguette-converter">
                <Text tid="factsConverterLabel" />
              </label>
              <div className="facts-modal__converter-row">
                <input
                  className="facts-modal__converter-input"
                  id="baguette-converter"
                  min="0"
                  onChange={(event) => setConverterValueKg(event.target.value)}
                  step="0.1"
                  type="number"
                  value={converterValueKg}
                />
                <span className="facts-modal__converter-unit">kg</span>
              </div>
              <p className="facts-modal__converter-result">
                {formatter.format(normalizedConverterValueKg)} kg = {formatter.format(baguetteEquivalent)} <Text tid="factsConverterResult" />
              </p>
              <p className="facts-modal__body"><Text tid="factsConverterBody" /></p>
            </article>
          </div>
        </section>

        <section className="facts-modal__section">
          <h3><Text tid="factsSpaceTitle" /></h3>
          <p><Text tid="factsSpaceIntro" /></p>
          <div className="facts-modal__space-grid">
            <article className="facts-modal__card facts-modal__card--tone-wheat">
              <span className="facts-modal__label"><Text tid="factsSpaceLineLabel" /></span>
              <strong className="facts-modal__value">{formatter.format(yearlyBaguetteLineKm / 1000000)} M km</strong>
              <p className="facts-modal__body"><Text tid="factsSpaceLineBody" /></p>
            </article>
            <article className="facts-modal__card facts-modal__card--tone-sand">
              <span className="facts-modal__label"><Text tid="factsSpaceEarthLabel" /></span>
              <strong className="facts-modal__value">{integerFormatter.format(yearlyBaguetteEarthTours)}</strong>
              <p className="facts-modal__body"><Text tid="factsSpaceEarthBody" /></p>
            </article>
            <article className="facts-modal__card facts-modal__card--tone-dust">
              <span className="facts-modal__label"><Text tid="factsSpaceMoonLabel" /></span>
              <strong className="facts-modal__value">{integerFormatter.format(Math.floor(yearlyBaguetteMoonTrips))}</strong>
              <p className="facts-modal__body"><Text tid="factsSpaceMoonBody" /></p>
            </article>
            <article className="facts-modal__card facts-modal__card--tone-stone">
              <span className="facts-modal__label"><Text tid="factsSpaceLightLabel" /></span>
              <strong className="facts-modal__value">{integerFormatter.format(yearlyBaguetteLightSeconds)} s</strong>
              <p className="facts-modal__body">
                <Text tid="factsSpaceLightBody" /> {percentFormatter.format(yearlyBaguetteLightYearPercent)} %.
              </p>
            </article>
          </div>
        </section>

        <section className="facts-modal__section">
          <h3><Text tid="factsScaleTitle" /></h3>
          <p><Text tid="factsScaleIntro" /></p>
          <div className="facts-modal__space-grid">
            <article className="facts-modal__card facts-modal__card--tone-clay">
              <span className="facts-modal__label"><Text tid="factsScaleEiffelLabel" /></span>
              <strong className="facts-modal__value">{integerFormatter.format(Math.floor(yearlyBaguetteEiffelTowers))}</strong>
              <p className="facts-modal__body"><Text tid="factsScaleEiffelBody" /></p>
            </article>
            <article className="facts-modal__card facts-modal__card--tone-dust">
              <span className="facts-modal__label"><Text tid="factsScaleWhaleLabel" /></span>
              <strong className="facts-modal__value">{integerFormatter.format(yearlyBaguetteBlueWhales)}</strong>
              <p className="facts-modal__body"><Text tid="factsScaleWhaleBody" /></p>
            </article>
            <article className="facts-modal__card facts-modal__card--wide facts-modal__card--tone-wheat">
              <span className="facts-modal__label"><Text tid="factsScaleVolumeLabel" /></span>
              <strong className="facts-modal__value">
                {integerFormatter.format(roundedYearlyBaguetteVolumeM3)}m<sup>3</sup>
              </strong>
              <p className="facts-modal__body">
                <Text tid="factsScaleVolumeBodyStart" /> {integerFormatter.format(yearlyBaguetteKhufuPyramids)} <Text tid="factsScaleVolumeBodyEnd" />
              </p>
            </article>
          </div>
        </section>

        <section className="facts-modal__section">
          <h3><Text tid="factsArrondissementsTitle" /></h3>
          <p><Text tid="factsArrondissementsIntro" /></p>
          <ArrondissementsMap
            arrondissementStats={arrondissementStats}
            dictionary={dictionary}
            integerFormatter={integerFormatter}
          />
        </section>
      </div>
    </div>
  );
};

const Col = () => {
  const { pins, rankselected, setPins, setRankselected, setFocusedBakeryKey, factsOpen, setFactsOpen } = useContext(PinContext);
  const [liveFacts, setLiveFacts] = useState(INITIAL_LIVE_FACTS);

  useEffect(() => {
    if (isReactSnap()) {
      setLiveFacts({
        bakeryCount: {
          status: 'error',
          value: null
        },
        baguettePrice: {
          status: 'error',
          value: null
        }
      });
      return undefined;
    }

    let isCancelled = false;

    async function loadLiveFacts() {
      try {
        const response = await fetch(LIVE_FACTS_ENDPOINT, {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (isCancelled) {
          return;
        }

        setLiveFacts({
          bakeryCount: payload?.bakeryCount?.status ? payload.bakeryCount : { status: 'error', value: null },
          baguettePrice: payload?.baguettePrice?.status ? payload.baguettePrice : { status: 'error', value: null }
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setLiveFacts({
          bakeryCount: {
            status: 'error',
            value: null
          },
          baguettePrice: {
            status: 'error',
            value: null
          }
        });
      }
    }

    loadLiveFacts();

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleFactBakerySelect(bakery) {
    setPins(0);
    setRankselected(0);
    setFocusedBakeryKey(bakery.selectionKey);
    setFactsOpen(false);
  }

  return (
    <>
      {factsOpen && (
        <FactsModal
          liveFacts={liveFacts}
          onClose={() => setFactsOpen(false)}
          onSelectBakery={handleFactBakerySelect}
        />
      )}
      <div className="pannel">
        <LanguageSelector />
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
        <div className="pannel__facts-cta">
          <button className="pannel__facts-button" onClick={() => setFactsOpen(true)} type="button">
            <span className="pannel__facts-icon">
              <StatsIcon />
            </span>
            <Text tid="factsButton" />
          </button>
        </div>
        <AdBanner />
      </div>
    </>
  );
};

export default Col;

import React, { useState, createContext, useContext, useEffect } from "react";
import {
  LANGUAGE_FALLBACK,
  buildLanguagePath,
  dictionaryList,
  getBrowserLanguage,
  getLanguageSegments,
  normalizeLanguage
} from './datas/languages.js';

export const PinContext = createContext(null);

function isReactSnap() {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';
}

function getLocationState() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const pathState = getLanguageSegments(pathname);
  const userLanguage = pathState.hasLanguageInPath
    ? pathState.normalizedLanguage
    : (isReactSnap() ? LANGUAGE_FALLBACK : getBrowserLanguage());

  return {
    pathname,
    pathState,
    userLanguage: normalizeLanguage(userLanguage) || LANGUAGE_FALLBACK
  };
}

function updateBrowserUrl(targetPath, mode = 'replace') {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }

  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', nextUrl);
}

export const PinContextProvider = props => {
    const initialLocationState = getLocationState();
    const [pins, setPins] = useState(0);
    const [rankselected, setRankselected] = useState(0);
    const [dm, setDm] = useState(false);
    const [warning, setWarning] = useState(false);
    const [closedBakeryReport, setClosedBakeryReport] = useState(null);
    const [routing, setRouting] = useState({
        loading: false,
        error: "",
        tooFar: false,
        route: null,
        destination: null,
        userPosition: null
    });
    const [userLanguage, setUserLanguage] = useState(initialLocationState.userLanguage);
    const [pathname, setPathname] = useState(initialLocationState.pathname);

    useEffect(() => {
      const syncFromLocation = (mode = 'replace') => {
        const nextState = getLocationState();
        let nextPathname = nextState.pathname;

        if (nextState.pathState.isAlias) {
          nextPathname = buildLanguagePath(nextState.userLanguage, nextState.pathname);
          updateBrowserUrl(nextPathname, 'replace');
        } else if (!nextState.pathState.hasLanguageInPath && !isReactSnap()) {
          nextPathname = buildLanguagePath(nextState.userLanguage, nextState.pathname);
          updateBrowserUrl(nextPathname, mode);
        }

        setUserLanguage(nextState.userLanguage);
        setPathname(nextPathname);
      };

      syncFromLocation('replace');

      const handlePopState = () => syncFromLocation('replace');
      window.addEventListener('popstate', handlePopState);

      return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const provider = {
      dm,
      setDm,
      pins, setPins,
      rankselected, setRankselected,
      warning,
      setWarning,
      closedBakeryReport,
      setClosedBakeryReport,
      routing,
      setRouting,
      pathname,
      userLanguage,
      dictionary: dictionaryList[userLanguage] || dictionaryList[LANGUAGE_FALLBACK],
      getLanguageHref: selected => buildLanguagePath(selected, pathname),
      userLanguageChange: selected => {
        const newLanguage = normalizeLanguage(selected) || LANGUAGE_FALLBACK;
        const nextPathname = buildLanguagePath(newLanguage, pathname);

        setUserLanguage(newLanguage);
        setPathname(nextPathname);
        updateBrowserUrl(nextPathname, 'push');
      }
    };

    return (
      <PinContext.Provider value={provider}>
        {props.children}
      </PinContext.Provider>
    );
};

export function Text({ tid }) {
  const languageContext = useContext(PinContext);
  let str = languageContext.dictionary[tid] ? languageContext.dictionary[tid] : "";
  return str;
};

export function FuncText(tid) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const pathState = getLanguageSegments(pathname);
  const lang = pathState.hasLanguageInPath
    ? pathState.normalizedLanguage
    : getBrowserLanguage();
  const dictionary = dictionaryList[lang] || dictionaryList[LANGUAGE_FALLBACK];
  return dictionary && dictionary[tid] ? dictionary[tid] : "";
};

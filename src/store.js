import React, { useState, createContext, useContext } from "react";
import { languageOptions, dictionaryList } from './datas/languages.js'; 

export const PinContext = createContext(null);
 
export function getCurrentLanguage () {
  let defaultLanguage = window.localStorage.getItem('mbp-lang');
  if (!defaultLanguage) {
    defaultLanguage = window.navigator.language.substring(0, 2);
  }
  return defaultLanguage;
}

export const PinContextProvider = props => {
    const [pins, setPins] = useState(0);
    const [rankselected, setRankselected] = useState(0);
    const [dm, setDm] = useState(false);
    const [warning, setWarning] = useState(false);
    const [userLanguage, setUserLanguage] = useState('fr');

    const provider = {
      dm,
      setDm,
      pins, setPins,
      rankselected, setRankselected,
      warning,
      setWarning,
      userLanguage,
      dictionary: dictionaryList[userLanguage],
      userLanguageChange: selected => {
        const newLanguage = languageOptions[selected] ? selected : 'fr'
        setUserLanguage(newLanguage);
        window.localStorage.setItem('mbp-lang', newLanguage);
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
  const lang = getCurrentLanguage();
  let str = dictionaryList[lang][tid] ? dictionaryList[lang][tid] : "";
  return str;
};
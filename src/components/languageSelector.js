import React, { useContext, useEffect } from 'react';

import { languageOptions } from '../datas/languages';
import { PinContext, getCurrentLanguage } from '../store.js';

export default function LanguageSelector() {
  const { userLanguage, userLanguageChange } = useContext(PinContext);

  // set selected language by calling context method
  const handleLanguageChange = e => {
    userLanguageChange(e.target.getAttribute("value"))
  };

  useEffect(() => {
    const defaultLanguage = getCurrentLanguage()
    userLanguageChange(defaultLanguage);
  }, [userLanguageChange]);

  return (
    <div className='langues'>
      {Object.entries(languageOptions).map(([id, name]) => (
        <span className={`${userLanguage === id ? "active" : ""}`} onClick={e => handleLanguageChange(e)} key={id} value={id}>{name}</span>
      ))}
    </div>
  );
};
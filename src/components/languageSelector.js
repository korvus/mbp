import React, { useContext } from 'react';

import { languageOptions } from '../datas/languages';
import { PinContext } from '../store.js';

export default function LanguageSelector() {
  const { userLanguage, userLanguageChange, getLanguageHref } = useContext(PinContext);

  const handleLanguageChange = (event, selected) => {
    event.preventDefault();
    if (selected && selected !== userLanguage) {
      userLanguageChange(selected);
    }
  };

  return (
    <div className='langues'>
      {Object.entries(languageOptions).map(([id, label]) => (
        <a
          key={id}
          href={getLanguageHref(id)}
          className={userLanguage === id ? 'active' : ''}
          hrefLang={id}
          lang={id}
          onClick={(event) => handleLanguageChange(event, id)}
        >
          {label}
        </a>
      ))}
    </div>
  );
};

import React, { useContext } from 'react';

import { languageOptions } from '../datas/languages';
import { PinContext } from '../store.js';

export default function LanguageSelector() {
  const { userLanguage, userLanguageChange } = useContext(PinContext);

  const handleLanguageChange = (selected) => {
    if (selected && selected !== userLanguage) {
      userLanguageChange(selected);
    }
  };

  return (
    <div className='langues'>
      {Object.entries(languageOptions).map(([id, label]) => (
        <span
          key={id}
          className={userLanguage === id ? 'active' : ''}
          onClick={() => handleLanguageChange(id)}
        >
          {label}
        </span>
      ))}
    </div>
  );
};

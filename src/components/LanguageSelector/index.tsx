/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import type { OptionsType, OptionTypeBase } from 'react-select';
import useSWR from 'swr';
import { Language } from '../../../server/lib/settings';
import globalMessages from '../../i18n/globalMessages';

const messages = defineMessages({
  originalLanguageDefault: 'All Languages',
  languageServerDefault: 'Default ({language})',
});

const Select = dynamic(() => import('react-select'), { ssr: false });

type OptionType = {
  value: string;
  label: string;
  isFixed?: boolean;
};

const selectStyles = {
  multiValueLabel: (base: any, state: { data: { isFixed?: boolean } }) => {
    return state.data.isFixed ? { ...base, paddingRight: 6 } : base;
  },
  multiValueRemove: (base: any, state: { data: { isFixed?: boolean } }) => {
    return state.data.isFixed ? { ...base, display: 'none' } : base;
  },
};

interface LanguageSelectorProps {
  value?: string;
  setFieldValue: (property: string, value: string) => void;
  serverValue?: string;
  isUserSettings?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  setFieldValue,
  serverValue,
  isUserSettings = false,
}) => {
  const intl = useIntl();
  const { data: languages } = useSWR<Language[]>('/api/v1/languages');

  const sortedLanguages = useMemo(
    () =>
      languages?.sort((lang1, lang2) => {
        const lang1Name =
          intl.formatDisplayName(lang1.iso_639_1, {
            type: 'language',
            fallback: 'none',
          }) ?? lang1.english_name;
        const lang2Name =
          intl.formatDisplayName(lang2.iso_639_1, {
            type: 'language',
            fallback: 'none',
          }) ?? lang2.english_name;

        return lang1Name === lang2Name ? 0 : lang1Name > lang2Name ? 1 : -1;
      }),
    [intl, languages]
  );

  function languageNameFallback(langCode: string): string {
    return (
      sortedLanguages?.find((language) => language.iso_639_1 === langCode)
        ?.english_name ?? langCode
    );
  }

  const options: OptionType[] =
    sortedLanguages?.map((language) => ({
      label:
        intl.formatDisplayName(language.iso_639_1, {
          type: 'language',
          fallback: 'none',
        }) ?? language.english_name,
      value: language.iso_639_1,
    })) ?? [];

  if (isUserSettings) {
    options.unshift({
      value: 'server',
      label: intl.formatMessage(messages.languageServerDefault, {
        language: serverValue
          ? serverValue
              .split('|')
              .map(
                (value) =>
                  intl.formatDisplayName(value, {
                    type: 'language',
                    fallback: 'none',
                  }) ?? languageNameFallback(value)
              )
              .reduce((prev, curr) =>
                intl.formatMessage(globalMessages.delimitedlist, {
                  a: prev,
                  b: curr,
                })
              )
          : intl.formatMessage(messages.originalLanguageDefault),
      }),
      isFixed: true,
    });
  }

  options.unshift({
    value: 'all',
    label: intl.formatMessage(messages.originalLanguageDefault),
    isFixed: true,
  });

  return (
    <Select
      options={options}
      isMulti
      className="react-select-container"
      classNamePrefix="react-select"
      value={
        (isUserSettings && value === 'all') || (!isUserSettings && !value)
          ? {
              value: 'all',
              label: intl.formatMessage(messages.originalLanguageDefault),
              isFixed: true,
            }
          : (value === '' || !value || value === 'server') && isUserSettings
          ? {
              value: 'server',
              label: intl.formatMessage(messages.languageServerDefault, {
                language: serverValue
                  ? serverValue
                      .split('|')
                      .map(
                        (value) =>
                          intl.formatDisplayName(value, {
                            type: 'language',
                            fallback: 'none',
                          }) ?? languageNameFallback(value)
                      )
                      .reduce((prev, curr) =>
                        intl.formatMessage(globalMessages.delimitedlist, {
                          a: prev,
                          b: curr,
                        })
                      )
                  : intl.formatMessage(messages.originalLanguageDefault),
              }),
              isFixed: true,
            }
          : value?.split('|').map((code) => {
              const matchedLanguage = sortedLanguages?.find(
                (lang) => lang.iso_639_1 === code
              );

              if (!matchedLanguage) {
                return undefined;
              }

              return {
                label:
                  intl.formatDisplayName(matchedLanguage.iso_639_1, {
                    type: 'language',
                    fallback: 'none',
                  }) ?? matchedLanguage.english_name,
                value: matchedLanguage.iso_639_1,
              };
            }) ?? undefined
      }
      onChange={(
        value: OptionTypeBase | OptionsType<OptionType> | null,
        options
      ) => {
        if (!Array.isArray(value)) {
          return;
        }

        if (
          (options &&
            options.action === 'select-option' &&
            options.option?.value === 'server') ||
          value?.every(
            (v: { value: string; label: string }) => v.value === 'server'
          )
        ) {
          return setFieldValue('originalLanguage', '');
        }

        if (
          (options &&
            options.action === 'select-option' &&
            options.option?.value === 'all') ||
          value?.every(
            (v: { value: string; label: string }) => v.value === 'all'
          )
        ) {
          return setFieldValue('originalLanguage', isUserSettings ? 'all' : '');
        }

        setFieldValue(
          'originalLanguage',
          value
            ?.map((lang) => lang.value)
            .filter((v) => v !== 'all')
            .join('|')
        );
      }}
      styles={selectStyles}
    />
  );
};

export default LanguageSelector;

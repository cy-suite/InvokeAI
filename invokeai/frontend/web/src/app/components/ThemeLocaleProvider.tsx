import {
  ChakraProvider,
  createLocalStorageManager,
  extendTheme,
} from '@chakra-ui/react';
import { RootState } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme as invokeAITheme } from 'theme/theme';

import { greenTeaThemeColors } from 'theme/colors/greenTea';
import { invokeAIThemeColors } from 'theme/colors/invokeAI';
import { lightThemeColors } from 'theme/colors/lightTheme';
import { oceanBlueColors } from 'theme/colors/oceanBlue';

import '@fontsource/inter/variable.css';
import { MantineProvider } from '@mantine/core';
import { mantineTheme } from 'mantine-theme/theme';
import 'overlayscrollbars/overlayscrollbars.css';
import 'theme/css/overlayscrollbars.css';

type ThemeLocaleProviderProps = {
  children: ReactNode;
};

const THEMES = {
  dark: invokeAIThemeColors,
  light: lightThemeColors,
  green: greenTeaThemeColors,
  ocean: oceanBlueColors,
};

const manager = createLocalStorageManager('@@invokeai-color-mode');

function ThemeLocaleProvider({ children }: ThemeLocaleProviderProps) {
  const { i18n } = useTranslation();

  const currentTheme = useAppSelector(
    (state: RootState) => state.ui.currentTheme
  );

  const direction = i18n.dir();

  const theme = extendTheme({
    ...invokeAITheme,
    colors: THEMES[currentTheme as keyof typeof THEMES],
    direction,
  });

  useEffect(() => {
    document.body.dir = direction;
  }, [direction]);

  return (
    <MantineProvider withGlobalStyles theme={mantineTheme}>
      <ChakraProvider theme={theme} colorModeManager={manager}>
        {children}
      </ChakraProvider>
    </MantineProvider>
  );
}

export default ThemeLocaleProvider;

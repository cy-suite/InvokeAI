import { Box, Flex } from '@chakra-ui/react';
import { getLoraModels } from 'app/socketio/actions';
import { useAppDispatch, useAppSelector } from 'app/storeHooks';
import IAIIconButton from 'common/components/IAIIconButton';
import IAISimpleMenu, { IAIMenuItem } from 'common/components/IAISimpleMenu';
import {
  setClearLoras,
  setLorasInUse,
} from 'features/parameters/store/generationSlice';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MdClear } from 'react-icons/md';

export default function LoraManager() {
  const dispatch = useAppDispatch();
  const foundLoras = useAppSelector((state) => state.system.foundLoras);
  const lorasInUse = useAppSelector((state) => state.generation.lorasInUse);

  const { t } = useTranslation();

  const handleLora = (lora: string) => {
    dispatch(setLorasInUse(lora));
  };

  useEffect(() => {
    dispatch(getLoraModels());
  }, [dispatch]);

  const renderLoraOption = (lora: string) => {
    const thisloraExists = lorasInUse.includes(lora);
    const loraExistsStyle = {
      fontWeight: 'bold',
      color: 'var(--context-menu-active-item)',
    };
    return <Box style={thisloraExists ? loraExistsStyle : {}}>{lora}</Box>;
  };

  const numOfActiveLoras = () => {
    const foundLoraNames: string[] = [];
    foundLoras?.forEach((lora) => {
      foundLoraNames.push(lora.name);
    });
    return foundLoraNames.filter((lora) => lorasInUse.includes(lora)).length;
  };

  const makeLoraItems = () => {
    const lorasFound: IAIMenuItem[] = [];
    foundLoras?.forEach((lora) => {
      if (lora.name !== ' ') {
        const newLoraItem: IAIMenuItem = {
          item: renderLoraOption(lora.name),
          onClick: () => handleLora(lora.name),
        };
        lorasFound.push(newLoraItem);
      }
    });
    return lorasFound;
  };

  return foundLoras && foundLoras?.length > 0 ? (
    <Flex columnGap={2}>
      <IAISimpleMenu
        menuItems={makeLoraItems()}
        menuType="regular"
        buttonText={`${t('modelManager.addLora')} (${numOfActiveLoras()})`}
        menuButtonProps={{ width: '100%', padding: '0 1rem' }}
      />
      <IAIIconButton
        icon={<MdClear />}
        tooltip={t('modelManager.clearLoras')}
        aria-label={t('modelManager.clearLoras')}
        onClick={() => dispatch(setClearLoras())}
      />
    </Flex>
  ) : (
    <Box
      background="var(--btn-base-color)"
      padding={2}
      textAlign="center"
      borderRadius={4}
      fontWeight="bold"
    >
      {t('modelManager.noLoraModels')}
    </Box>
  );
}

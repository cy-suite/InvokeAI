import type { ChakraProps } from '@chakra-ui/react';
import { Flex, ListItem, OrderedList, Spinner } from '@chakra-ui/react';
import { createMemoizedSelector } from 'app/store/createMemoizedSelector';
import { useAppSelector } from 'app/store/storeHooks';
import { IAINoContentFallback } from 'common/components/IAIImageFallback';
import IAIInformationalPopover from 'common/components/IAIInformationalPopover/IAIInformationalPopover';
import { InvText } from 'common/components/InvText/wrapper';
import ScrollableContent from 'common/components/OverlayScrollbars/ScrollableContent';
import { selectDynamicPromptsSlice } from 'features/dynamicPrompts/store/dynamicPromptsSlice';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCircleExclamation } from 'react-icons/fa6';

const selectPrompts = createMemoizedSelector(
  selectDynamicPromptsSlice,
  (dynamicPrompts) => dynamicPrompts.prompts
);

const listItemStyles: ChakraProps['sx'] = {
  '&::marker': { color: 'base.500' },
};

const ParamDynamicPromptsPreview = () => {
  const { t } = useTranslation();
  const parsingError = useAppSelector((s) => s.dynamicPrompts.parsingError);
  const isError = useAppSelector((s) => s.dynamicPrompts.isError);
  const isLoading = useAppSelector((s) => s.dynamicPrompts.isLoading);
  const prompts = useAppSelector(selectPrompts);

  const label = useMemo(() => {
    let _label = `${t('dynamicPrompts.promptsPreview')} (${prompts.length})`;
    if (parsingError) {
      _label += ` - ${parsingError}`;
    }
    return _label;
  }, [parsingError, prompts.length, t]);

  if (isError) {
    return (
      <IAIInformationalPopover feature="dynamicPrompts">
        <Flex
          w="full"
          h="full"
          layerStyle="second"
          alignItems="center"
          justifyContent="center"
          p={8}
        >
          <IAINoContentFallback
            icon={FaCircleExclamation}
            label="Problem generating prompts"
          />
        </Flex>
      </IAIInformationalPopover>
    );
  }

  return (
    <>
      <InvText fontSize="sm" fontWeight="bold">
        {label}
      </InvText>
      <Flex
        w="full"
        h="full"
        pos="relative"
        layerStyle="first"
        p={4}
        borderRadius="base"
      >
        <ScrollableContent>
          <OrderedList stylePosition="inside" ms={0}>
            {prompts.map((prompt, i) => (
              <ListItem
                fontSize="sm"
                key={`${prompt}.${i}`}
                sx={listItemStyles}
              >
                <InvText as="span">{prompt}</InvText>
              </ListItem>
            ))}
          </OrderedList>
        </ScrollableContent>
        {isLoading && (
          <Flex
            pos="absolute"
            w="full"
            h="full"
            top={0}
            insetInlineStart={0}
            layerStyle="second"
            opacity={0.7}
            alignItems="center"
            justifyContent="center"
          >
            <Spinner />
          </Flex>
        )}
      </Flex>
    </>
  );
};

export default memo(ParamDynamicPromptsPreview);

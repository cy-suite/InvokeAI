import { Divider, Flex, Heading, IconButton, Input, InputGroup, InputRightElement, Text } from '@invoke-ai/ui-library';
import ScrollableContent from 'common/components/OverlayScrollbars/ScrollableContent';
import { t } from 'i18next';
import type { ChangeEventHandler } from 'react';
import { useCallback, useState } from 'react';
import { PiXBold } from 'react-icons/pi';
import { ScanModelResultItem } from './ScanModelResultItem';

export const ScanModelsResults = ({ results }: { results: string[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState(results);

  const handleSearch: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setSearchTerm(e.target.value);
      setFilteredResults(
        results.filter((result) => {
          const modelName = result.split('\\').slice(-1)[0];
          return modelName?.includes(e.target.value);
        })
      );
    },
    [results]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return (
    <>
      <Divider mt={4} />
      <Flex flexDir="column" gap={2} mt={4} height="100%">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading fontSize="md" as="h4">
            Scan Results
          </Heading>
          <InputGroup maxW="300px" size="xs">
            <Input
              placeholder={t('modelManager.search')}
              value={searchTerm || ''}
              data-testid="board-search-input"
              onChange={handleSearch}
              size="xs"
            />

            {!!searchTerm?.length && (
              <InputRightElement h="full" pe={2}>
                <IconButton
                  size="sm"
                  variant="link"
                  aria-label={t('boards.clearSearch')}
                  icon={<PiXBold />}
                  onClick={clearSearch}
                />
              </InputRightElement>
            )}
          </InputGroup>
        </Flex>
        <Flex height="100%" layerStyle="third" borderRadius="base" p={4} mt={4} mb={4}>
          <ScrollableContent>
            <Flex flexDir="column" gap={3}>
              {filteredResults.map((result) => (
                <ScanModelResultItem key={result} result={result} />
              ))}
            </Flex>
          </ScrollableContent>
        </Flex>
      </Flex>
    </>
  );
};

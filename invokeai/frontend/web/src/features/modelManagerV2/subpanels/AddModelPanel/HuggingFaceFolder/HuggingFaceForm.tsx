import { Button, Flex, FormControl, FormErrorMessage, FormLabel, Input } from '@invoke-ai/ui-library';
import { useAppDispatch } from 'app/store/storeHooks';
import { addToast } from 'features/system/store/systemSlice';
import { makeToast } from 'features/system/util/makeToast';
import type { ChangeEventHandler } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstallModelMutation, useLazyGetHuggingFaceModelsQuery } from 'services/api/endpoints/models';

import { HuggingFaceResults } from './HuggingFaceResults';

export const HuggingFaceForm = () => {
  const [huggingFaceRepo, setHuggingFaceRepo] = useState('');
  const [displayResults, setDisplayResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [_getHuggingFaceModels, { isLoading, data }] = useLazyGetHuggingFaceModelsQuery();
  const [installModel] = useInstallModelMutation();

  const handleInstallModel = useCallback((source: string) => {
    installModel({ source })
      .unwrap()
      .then((_) => {
        dispatch(
          addToast(
            makeToast({
              title: t('toast.modelAddedSimple'),
              status: 'success',
            })
          )
        );
      })
      .catch((error) => {
        if (error) {
          dispatch(
            addToast(
              makeToast({
                title: `${error.data.detail} `,
                status: 'error',
              })
            )
          );
        }
      });
  }, [installModel, dispatch, t]);

  const scanFolder = useCallback(async () => {
    _getHuggingFaceModels(huggingFaceRepo)
      .then((response) => {
        if (response.data?.some((result) => result.endsWith('model_index.json'))) {
          handleInstallModel(huggingFaceRepo);
          setDisplayResults(false);
        } else if (response.data?.length === 1 && response.data[0]) {
          handleInstallModel(response.data[0]);
          setDisplayResults(false);
        } else {
          setDisplayResults(true);
        }
      })
      .catch((error) => {
        if (error) {
          setErrorMessage(error.data.detail);
        }
      });
  }, [_getHuggingFaceModels, huggingFaceRepo]);

  const handleSetHuggingFaceRepo: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setHuggingFaceRepo(e.target.value);
    setErrorMessage('');
  }, []);

  return (
    <Flex flexDir="column" height="100%">
      <FormControl isInvalid={!!errorMessage.length} w="full">
        <Flex flexDir="column" w="full">
          <Flex gap={2} alignItems="flex-end" justifyContent="space-between">
            <Flex direction="column" w="full">
              <FormLabel>{t('modelManager.huggingFaceRepoID')}</FormLabel>
              <Input value={huggingFaceRepo} onChange={handleSetHuggingFaceRepo} />
            </Flex>

            <Button onClick={scanFolder} isLoading={isLoading} isDisabled={huggingFaceRepo.length === 0}>
              {t('modelManager.addModel')}
            </Button>
          </Flex>
          {!!errorMessage.length && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
        </Flex>
      </FormControl>
      {data && displayResults && <HuggingFaceResults results={data} />}
    </Flex>
  );
};

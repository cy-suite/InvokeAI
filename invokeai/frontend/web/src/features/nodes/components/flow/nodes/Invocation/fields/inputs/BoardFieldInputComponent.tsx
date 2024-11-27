import type { ComboboxOnChange, ComboboxOption } from '@invoke-ai/ui-library';
import { Combobox, FormControl } from '@invoke-ai/ui-library';
import { EMPTY_ARRAY } from 'app/store/constants';
import { useAppDispatch } from 'app/store/storeHooks';
import { fieldBoardValueChanged } from 'features/nodes/store/nodesSlice';
import type { BoardFieldInputInstance, BoardFieldInputTemplate } from 'features/nodes/types/field';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListAllBoardsQuery } from 'services/api/endpoints/boards';

import type { FieldComponentProps } from './types';

const BoardFieldInputComponent = (props: FieldComponentProps<BoardFieldInputInstance, BoardFieldInputTemplate>) => {
  const { nodeId, field } = props;
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { options, hasBoards } = useListAllBoardsQuery(
    { include_archived: true },
    {
      selectFromResult: ({ data }) => {
        if (!data) {
          return {
            options: EMPTY_ARRAY,
            hasBoards: false,
          };
        }

        const options: ComboboxOption[] = data.map(({ board_id, board_name, image_count }) => ({
          label: `${board_name} (${image_count})`,
          value: board_id,
        }));

        return {
          options,
          hasBoards: options.length > 1,
        };
      },
    }
  );

  const onChange = useCallback<ComboboxOnChange>(
    (v) => {
      if (!v) {
        return;
      }
      dispatch(
        fieldBoardValueChanged({
          nodeId,
          fieldName: field.name,
          value: { board_id: v.value },
        })
      );
    },
    [dispatch, field.name, nodeId]
  );

  const value = useMemo(() => options.find((o) => o.value === field.value?.board_id) ?? null, [options, field.value]);

  const noOptionsMessage = useCallback(() => t('boards.noMatching'), [t]);

  return (
    <FormControl className="nowheel nodrag" isDisabled={!hasBoards}>
      <Combobox
        value={value}
        options={options}
        onChange={onChange}
        placeholder={t('boards.selectBoard')}
        noOptionsMessage={noOptionsMessage}
      />
    </FormControl>
  );
};

export default memo(BoardFieldInputComponent);

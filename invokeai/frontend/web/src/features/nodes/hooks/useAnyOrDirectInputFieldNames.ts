import { EMPTY_ARRAY } from 'app/store/constants';
import { useNodeTemplate } from 'features/nodes/hooks/useNodeTemplate';
import { getSortedFilteredFieldNames } from 'features/nodes/util/node/getSortedFilteredFieldNames';
import { TEMPLATE_BUILDER_MAP } from 'features/nodes/util/schema/buildFieldInputTemplate';
import { keys, map } from 'lodash-es';
import { useMemo } from 'react';

export const useAnyOrDirectInputFieldNames = (nodeId: string): string[] => {
  const template = useNodeTemplate(nodeId);

  const fieldNames = useMemo(() => {
    const fields = map(template.inputs).filter((field) => {
      return (
        (['any', 'direct'].includes(field.input) || field.type.isCollectionOrScalar) &&
        keys(TEMPLATE_BUILDER_MAP).includes(field.type.name)
      );
    });
    const _fieldNames = getSortedFilteredFieldNames(fields);
    if (_fieldNames.length === 0) {
      return EMPTY_ARRAY;
    }
    return _fieldNames;
  }, [template.inputs]);

  return fieldNames;
};

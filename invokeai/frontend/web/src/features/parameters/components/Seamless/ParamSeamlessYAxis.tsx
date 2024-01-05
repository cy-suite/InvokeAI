import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InvControl } from 'common/components/InvControl/InvControl';
import { InvSwitch } from 'common/components/InvSwitch/wrapper';
import { setSeamlessYAxis } from 'features/parameters/store/generationSlice';
import type { ChangeEvent } from 'react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ParamSeamlessYAxis = () => {
  const { t } = useTranslation();
  const seamlessYAxis = useAppSelector((s) => s.generation.seamlessYAxis);
  const dispatch = useAppDispatch();
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dispatch(setSeamlessYAxis(e.target.checked));
    },
    [dispatch]
  );

  return (
    <InvControl label={t('parameters.seamlessYAxis')}>
      <InvSwitch isChecked={seamlessYAxis} onChange={handleChange} />
    </InvControl>
  );
};

export default memo(ParamSeamlessYAxis);

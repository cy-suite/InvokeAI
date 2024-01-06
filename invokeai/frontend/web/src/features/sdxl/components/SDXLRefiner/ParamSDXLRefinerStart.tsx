import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InvControl } from 'common/components/InvControl/InvControl';
import { InvSlider } from 'common/components/InvSlider/InvSlider';
import { setRefinerStart } from 'features/sdxl/store/sdxlSlice';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const ParamSDXLRefinerStart = () => {
  const refinerStart = useAppSelector((s) => s.sdxl.refinerStart);
  const dispatch = useAppDispatch();
  const handleChange = useCallback(
    (v: number) => dispatch(setRefinerStart(v)),
    [dispatch]
  );
  const { t } = useTranslation();

  return (
    <InvControl label={t('sdxl.refinerStart')}>
      <InvSlider
        step={0.01}
        min={0}
        max={1}
        onChange={handleChange}
        defaultValue={0.8}
        value={refinerStart}
        withNumberInput
        marks
      />
    </InvControl>
  );
};

export default memo(ParamSDXLRefinerStart);

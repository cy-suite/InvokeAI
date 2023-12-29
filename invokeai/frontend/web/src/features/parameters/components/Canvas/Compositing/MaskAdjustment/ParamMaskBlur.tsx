import type { RootState } from 'app/store/store';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { InvControl } from 'common/components/InvControl/InvControl';
import { InvSlider } from 'common/components/InvSlider/InvSlider';
import { setMaskBlur } from 'features/parameters/store/generationSlice';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export default function ParamMaskBlur() {
  const dispatch = useAppDispatch();
  const maskBlur = useAppSelector(
    (state: RootState) => state.generation.maskBlur
  );
  const { t } = useTranslation();

  const handleChange = useCallback(
    (v: number) => {
      dispatch(setMaskBlur(v));
    },
    [dispatch]
  );
  const handleReset = useCallback(() => {
    dispatch(setMaskBlur(16));
  }, [dispatch]);

  return (
    <InvControl label={t('parameters.maskBlur')} feature="compositingBlur">
      <InvSlider
        min={0}
        max={64}
        value={maskBlur}
        onReset={handleReset}
        onChange={handleChange}
        marks
        withNumberInput
        numberInputMax={512}
      />
    </InvControl>
  );
}

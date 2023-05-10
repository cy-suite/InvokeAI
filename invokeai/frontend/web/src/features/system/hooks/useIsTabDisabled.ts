import { RootState } from 'app/store/store';
import { useAppSelector } from 'app/store/storeHooks';
import { InvokeTabName } from 'features/ui/store/tabMap';
import { useCallback } from 'react';

export const useIsTabDisabled = () => {
  const disabledTabs = useAppSelector(
    (state: RootState) => state.config.disabledTabs
  );

  const isTabDisabled = useCallback(
    (tab: InvokeTabName) => disabledTabs.includes(tab),
    [disabledTabs]
  );

  return isTabDisabled;
};

import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  FlexProps,
  Grid,
  Icon,
  Skeleton,
  Text,
  VStack,
  forwardRef,
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import IAIButton from 'common/components/IAIButton';
import IAISimpleCheckbox from 'common/components/IAISimpleCheckbox';
import IAIIconButton from 'common/components/IAIIconButton';
import IAIPopover from 'common/components/IAIPopover';
import IAISlider from 'common/components/IAISlider';
import { gallerySelector } from 'features/gallery/store/gallerySelectors';
import {
  setGalleryImageMinimumWidth,
  setGalleryImageObjectFit,
  setShouldAutoSwitchToNewImages,
  setShouldUseSingleGalleryColumn,
  setGalleryView,
} from 'features/gallery/store/gallerySlice';
import { togglePinGalleryPanel } from 'features/ui/store/uiSlice';
import { useOverlayScrollbars } from 'overlayscrollbars-react';

import {
  ChangeEvent,
  PropsWithChildren,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import { FaImage, FaServer, FaWrench } from 'react-icons/fa';
import { MdPhotoLibrary } from 'react-icons/md';
import HoverableImage from './HoverableImage';

import { requestCanvasRescale } from 'features/canvas/store/thunks/requestCanvasScale';
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'app/store/store';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import { defaultSelectorOptions } from 'app/store/util/defaultMemoizeOptions';
import { uiSelector } from 'features/ui/store/uiSelectors';
import {
  ASSETS_CATEGORIES,
  IMAGE_CATEGORIES,
  imageCategoriesChanged,
  selectImagesAll,
} from '../store/imagesSlice';
import { receivedPageOfImages } from 'services/api/thunks/image';
import BoardsList from './Boards/BoardsList';
import { boardsSelector } from '../store/boardSlice';
import { ChevronUpIcon } from '@chakra-ui/icons';
import { useListAllBoardsQuery } from 'services/api/endpoints/boards';
import { mode } from 'theme/util/mode';

const itemSelector = createSelector(
  [(state: RootState) => state],
  (state) => {
    const { categories, total: allImagesTotal, isLoading } = state.images;
    const { selectedBoardId } = state.boards;

    const allImages = selectImagesAll(state);

    const images = allImages.filter((i) => {
      const isInCategory = categories.includes(i.image_category);
      const isInSelectedBoard = selectedBoardId
        ? i.board_id === selectedBoardId
        : true;
      return isInCategory && isInSelectedBoard;
    });

    return {
      images,
      allImagesTotal,
      isLoading,
      categories,
      selectedBoardId,
    };
  },
  defaultSelectorOptions
);

const mainSelector = createSelector(
  [gallerySelector, uiSelector, boardsSelector],
  (gallery, ui, boards) => {
    const {
      galleryImageMinimumWidth,
      galleryImageObjectFit,
      shouldAutoSwitchToNewImages,
      shouldUseSingleGalleryColumn,
      selectedImage,
      galleryView,
    } = gallery;

    const { shouldPinGallery } = ui;
    return {
      shouldPinGallery,
      galleryImageMinimumWidth,
      galleryImageObjectFit,
      shouldAutoSwitchToNewImages,
      shouldUseSingleGalleryColumn,
      selectedImage,
      galleryView,
      selectedBoardId: boards.selectedBoardId,
    };
  },
  defaultSelectorOptions
);

const ImageGalleryContent = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const resizeObserverRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [initialize, osInstance] = useOverlayScrollbars({
    defer: true,
    options: {
      scrollbars: {
        visibility: 'auto',
        autoHide: 'leave',
        autoHideDelay: 1300,
        theme: 'os-theme-dark',
      },
      overflow: { x: 'hidden' },
    },
  });

  const { colorMode } = useColorMode();

  const {
    shouldPinGallery,
    galleryImageMinimumWidth,
    galleryImageObjectFit,
    shouldAutoSwitchToNewImages,
    shouldUseSingleGalleryColumn,
    selectedImage,
    galleryView,
  } = useAppSelector(mainSelector);

  const { images, isLoading, allImagesTotal, categories, selectedBoardId } =
    useAppSelector(itemSelector);

  const { selectedBoard } = useListAllBoardsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      selectedBoard: data?.find((b) => b.board_id === selectedBoardId),
    }),
  });

  const filteredImagesTotal = useMemo(
    () => selectedBoard?.image_count ?? allImagesTotal,
    [allImagesTotal, selectedBoard?.image_count]
  );

  const areMoreAvailable = useMemo(() => {
    return images.length < filteredImagesTotal;
  }, [images.length, filteredImagesTotal]);

  const handleLoadMoreImages = useCallback(() => {
    dispatch(
      receivedPageOfImages({
        categories,
        board_id: selectedBoardId,
        is_intermediate: false,
      })
    );
  }, [categories, dispatch, selectedBoardId]);

  const handleEndReached = useMemo(() => {
    if (areMoreAvailable && !isLoading) {
      return handleLoadMoreImages;
    }
    return undefined;
  }, [areMoreAvailable, handleLoadMoreImages, isLoading]);

  const { isOpen: isBoardListOpen, onToggle } = useDisclosure();

  const handleChangeGalleryImageMinimumWidth = (v: number) => {
    dispatch(setGalleryImageMinimumWidth(v));
  };

  const handleSetShouldPinGallery = () => {
    dispatch(togglePinGalleryPanel());
    dispatch(requestCanvasRescale());
  };

  useEffect(() => {
    const { current: root } = rootRef;
    if (scroller && root) {
      initialize({
        target: root,
        elements: {
          viewport: scroller,
        },
      });
    }
    return () => osInstance()?.destroy();
  }, [scroller, initialize, osInstance]);

  const setScrollerRef = useCallback((ref: HTMLElement | Window | null) => {
    if (ref instanceof HTMLElement) {
      setScroller(ref);
    }
  }, []);

  const handleClickImagesCategory = useCallback(() => {
    dispatch(imageCategoriesChanged(IMAGE_CATEGORIES));
    dispatch(setGalleryView('images'));
  }, [dispatch]);

  const handleClickAssetsCategory = useCallback(() => {
    dispatch(imageCategoriesChanged(ASSETS_CATEGORIES));
    dispatch(setGalleryView('assets'));
  }, [dispatch]);

  return (
    <VStack
      sx={{
        flexDirection: 'column',
        h: 'full',
        w: 'full',
        borderRadius: 'base',
      }}
    >
      <Box sx={{ w: 'full' }}>
        <Flex
          ref={resizeObserverRef}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <ButtonGroup isAttached>
            <IAIIconButton
              tooltip={t('gallery.images')}
              aria-label={t('gallery.images')}
              onClick={handleClickImagesCategory}
              isChecked={galleryView === 'images'}
              size="sm"
              icon={<FaImage />}
            />
            <IAIIconButton
              tooltip={t('gallery.assets')}
              aria-label={t('gallery.assets')}
              onClick={handleClickAssetsCategory}
              isChecked={galleryView === 'assets'}
              size="sm"
              icon={<FaServer />}
            />
          </ButtonGroup>
          <Flex
            as={Button}
            onClick={onToggle}
            size="sm"
            variant="ghost"
            sx={{
              w: 'full',
              justifyContent: 'center',
              alignItems: 'center',
              px: 2,
              _hover: {
                bg: mode('base.100', 'base.800')(colorMode),
              },
            }}
          >
            <Text
              noOfLines={1}
              sx={{
                w: 'full',
                color: mode('base.800', 'base.200')(colorMode),
                fontWeight: 600,
              }}
            >
              {selectedBoard ? selectedBoard.board_name : 'All Images'}
            </Text>
            <ChevronUpIcon
              sx={{
                transform: isBoardListOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transitionProperty: 'common',
                transitionDuration: 'normal',
              }}
            />
          </Flex>
          <IAIPopover
            triggerComponent={
              <IAIIconButton
                tooltip={t('gallery.gallerySettings')}
                aria-label={t('gallery.gallerySettings')}
                size="sm"
                icon={<FaWrench />}
              />
            }
          >
            <Flex direction="column" gap={2}>
              <IAISlider
                value={galleryImageMinimumWidth}
                onChange={handleChangeGalleryImageMinimumWidth}
                min={32}
                max={256}
                hideTooltip={true}
                label={t('gallery.galleryImageSize')}
                withReset
                handleReset={() => dispatch(setGalleryImageMinimumWidth(64))}
              />
              <IAISimpleCheckbox
                label={t('gallery.maintainAspectRatio')}
                isChecked={galleryImageObjectFit === 'contain'}
                onChange={() =>
                  dispatch(
                    setGalleryImageObjectFit(
                      galleryImageObjectFit === 'contain' ? 'cover' : 'contain'
                    )
                  )
                }
              />
              <IAISimpleCheckbox
                label={t('gallery.autoSwitchNewImages')}
                isChecked={shouldAutoSwitchToNewImages}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  dispatch(setShouldAutoSwitchToNewImages(e.target.checked))
                }
              />
              <IAISimpleCheckbox
                label={t('gallery.singleColumnLayout')}
                isChecked={shouldUseSingleGalleryColumn}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  dispatch(setShouldUseSingleGalleryColumn(e.target.checked))
                }
              />
            </Flex>
          </IAIPopover>

          <IAIIconButton
            size="sm"
            aria-label={t('gallery.pinGallery')}
            tooltip={`${t('gallery.pinGallery')} (Shift+G)`}
            onClick={handleSetShouldPinGallery}
            icon={shouldPinGallery ? <BsPinAngleFill /> : <BsPinAngle />}
          />
        </Flex>
        <Box>
          <BoardsList isOpen={isBoardListOpen} />
        </Box>
      </Box>
      <Flex direction="column" gap={2} h="full" w="full">
        {isLoading ? (
          <LoadingGallery />
        ) : images.length || areMoreAvailable ? (
          <>
            <Box ref={rootRef} data-overlayscrollbars="" h="100%">
              {shouldUseSingleGalleryColumn ? (
                <Virtuoso
                  style={{ height: '100%' }}
                  data={images}
                  endReached={handleEndReached}
                  scrollerRef={(ref) => setScrollerRef(ref)}
                  itemContent={(index, item) => (
                    <Flex sx={{ pb: 2 }}>
                      <HoverableImage
                        key={`${item.image_name}-${item.thumbnail_url}`}
                        image={item}
                        isSelected={selectedImage === item?.image_name}
                      />
                    </Flex>
                  )}
                />
              ) : (
                <VirtuosoGrid
                  style={{ height: '100%' }}
                  data={images}
                  endReached={handleEndReached}
                  components={{
                    Item: ItemContainer,
                    List: ListContainer,
                  }}
                  scrollerRef={setScroller}
                  itemContent={(index, item) => (
                    <HoverableImage
                      key={`${item.image_name}-${item.thumbnail_url}`}
                      image={item}
                      isSelected={selectedImage === item?.image_name}
                    />
                  )}
                />
              )}
            </Box>
            <IAIButton
              onClick={handleLoadMoreImages}
              isDisabled={!areMoreAvailable}
              isLoading={isLoading}
              loadingText="Loading"
              flexShrink={0}
            >
              {areMoreAvailable
                ? t('gallery.loadMore')
                : t('gallery.allImagesLoaded')}
            </IAIButton>
          </>
        ) : (
          <EmptyGallery />
        )}
      </Flex>
    </VStack>
  );
};

type ItemContainerProps = PropsWithChildren & FlexProps;
const ItemContainer = forwardRef((props: ItemContainerProps, ref) => (
  <Box className="item-container" ref={ref}>
    {props.children}
  </Box>
));

type ListContainerProps = PropsWithChildren & FlexProps;
const ListContainer = forwardRef((props: ListContainerProps, ref) => {
  const galleryImageMinimumWidth = useAppSelector(
    (state: RootState) => state.gallery.galleryImageMinimumWidth
  );

  return (
    <Grid
      {...props}
      className="list-container"
      ref={ref}
      sx={{
        gap: 2,
        gridTemplateColumns: `repeat(auto-fit, minmax(${galleryImageMinimumWidth}px, 1fr));`,
      }}
    >
      {props.children}
    </Grid>
  );
});

const LoadingGallery = () => {
  return (
    <Box data-overlayscrollbars="" h="100%">
      <VirtuosoGrid
        style={{ height: '100%' }}
        data={new Array(20)}
        components={{
          Item: ItemContainer,
          List: ListContainer,
        }}
        itemContent={(index, item) => (
          <Flex sx={{ pb: 2 }}>
            <Skeleton sx={{ width: 'full', paddingBottom: '100%' }} />
          </Flex>
        )}
      />
    </Box>
  );
};
const EmptyGallery = () => {
  const { t } = useTranslation();
  return (
    <Flex
      sx={{
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 8,
        h: '100%',
        w: '100%',
        color: 'base.500',
      }}
    >
      <Icon
        as={MdPhotoLibrary}
        sx={{
          w: 16,
          h: 16,
        }}
      />
      <Text textAlign="center">{t('gallery.noImagesInGallery')}</Text>
    </Flex>
  );
};

export default memo(ImageGalleryContent);

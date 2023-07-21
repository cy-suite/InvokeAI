import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { uniq } from 'lodash-es';
import { boardsApi } from 'services/api/endpoints/boards';
import { ImageCategory } from 'services/api/types';

export const IMAGE_CATEGORIES: ImageCategory[] = ['general'];
export const ASSETS_CATEGORIES: ImageCategory[] = [
  'control',
  'mask',
  'user',
  'other',
];
export const INITIAL_IMAGE_LIMIT = 100;
export const IMAGE_LIMIT = 20;

export type GalleryView = 'images' | 'assets';
// export type BoardId = 'no_board' | (string & Record<never, never>);
export type BoardId = string | undefined;

type GalleryState = {
  selection: string[];
  shouldAutoSwitch: boolean;
  autoAddBoardId: string | undefined;
  galleryImageMinimumWidth: number;
  selectedBoardId: BoardId;
  galleryView: GalleryView;
  batchImageNames: string[];
  isBatchEnabled: boolean;
};

export const initialGalleryState: GalleryState = {
  selection: [],
  shouldAutoSwitch: true,
  autoAddBoardId: undefined,
  galleryImageMinimumWidth: 96,
  selectedBoardId: undefined,
  galleryView: 'images',
  batchImageNames: [],
  isBatchEnabled: false,
};

export const gallerySlice = createSlice({
  name: 'gallery',
  initialState: initialGalleryState,
  reducers: {
    imageRangeEndSelected: (state, action: PayloadAction<string>) => {
      // MULTI SELECT LOGIC
      // const rangeEndImageName = action.payload;
      // const lastSelectedImage = state.selection[state.selection.length - 1];
      // const filteredImages = selectFilteredImagesLocal(state);
      // const lastClickedIndex = filteredImages.findIndex(
      //   (n) => n.image_name === lastSelectedImage
      // );
      // const currentClickedIndex = filteredImages.findIndex(
      //   (n) => n.image_name === rangeEndImageName
      // );
      // if (lastClickedIndex > -1 && currentClickedIndex > -1) {
      //   // We have a valid range!
      //   const start = Math.min(lastClickedIndex, currentClickedIndex);
      //   const end = Math.max(lastClickedIndex, currentClickedIndex);
      //   const imagesToSelect = filteredImages
      //     .slice(start, end + 1)
      //     .map((i) => i.image_name);
      //   state.selection = uniq(state.selection.concat(imagesToSelect));
      // }
    },
    imageSelectionToggled: (state, action: PayloadAction<string>) => {
      // MULTI SELECT LOGIC
      // if (
      //   state.selection.includes(action.payload) &&
      //   state.selection.length > 1
      // ) {
      //   state.selection = state.selection.filter(
      //     (imageName) => imageName !== action.payload
      //   );
      // } else {
      //   state.selection = uniq(state.selection.concat(action.payload));
      // }
    },
    imageSelected: (state, action: PayloadAction<string | null>) => {
      state.selection = action.payload ? [action.payload] : [];
    },
    shouldAutoSwitchChanged: (state, action: PayloadAction<boolean>) => {
      state.shouldAutoSwitch = action.payload;
    },
    setGalleryImageMinimumWidth: (state, action: PayloadAction<number>) => {
      state.galleryImageMinimumWidth = action.payload;
    },
    boardIdSelected: (state, action: PayloadAction<BoardId>) => {
      state.selectedBoardId = action.payload;
      state.galleryView = 'images';
    },
    isBatchEnabledChanged: (state, action: PayloadAction<boolean>) => {
      state.isBatchEnabled = action.payload;
    },
    imagesAddedToBatch: (state, action: PayloadAction<string[]>) => {
      state.batchImageNames = uniq(
        state.batchImageNames.concat(action.payload)
      );
    },
    imagesRemovedFromBatch: (state, action: PayloadAction<string[]>) => {
      state.batchImageNames = state.batchImageNames.filter(
        (imageName) => !action.payload.includes(imageName)
      );

      const newSelection = state.selection.filter(
        (imageName) => !action.payload.includes(imageName)
      );

      if (newSelection.length) {
        state.selection = newSelection;
        return;
      }

      state.selection = [state.batchImageNames[0]] ?? [];
    },
    batchReset: (state) => {
      state.batchImageNames = [];
      state.selection = [];
    },
    autoAddBoardIdChanged: (
      state,
      action: PayloadAction<string | undefined>
    ) => {
      state.autoAddBoardId = action.payload;
    },
    galleryViewChanged: (state, action: PayloadAction<GalleryView>) => {
      state.galleryView = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isAnyBoardDeleted, (state, action) => {
      const deletedBoardId = action.meta.arg.originalArgs;
      if (deletedBoardId === state.selectedBoardId) {
        state.selectedBoardId = undefined;
        state.galleryView = 'images';
      }
      if (deletedBoardId === state.autoAddBoardId) {
        state.autoAddBoardId = undefined;
      }
    });
    builder.addMatcher(
      boardsApi.endpoints.listAllBoards.matchFulfilled,
      (state, action) => {
        const boards = action.payload;
        if (!state.autoAddBoardId) {
          return;
        }

        if (!boards.map((b) => b.board_id).includes(state.autoAddBoardId)) {
          state.autoAddBoardId = undefined;
        }
      }
    );
  },
});

export const {
  imagesRemoved,
  imageRangeEndSelected,
  imageSelectionToggled,
  imageSelected,
  shouldAutoSwitchChanged,
  setGalleryImageMinimumWidth,
  boardIdSelected,
  isBatchEnabledChanged,
  imagesAddedToBatch,
  imagesRemovedFromBatch,
  autoAddBoardIdChanged,
  galleryViewChanged,
} = gallerySlice.actions;

export default gallerySlice.reducer;

const isAnyBoardDeleted = isAnyOf(
  boardsApi.endpoints.deleteBoard.matchFulfilled,
  boardsApi.endpoints.deleteBoardAndImages.matchFulfilled
);

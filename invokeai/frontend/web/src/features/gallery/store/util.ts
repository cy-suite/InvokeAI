import { isEqual } from 'lodash-es';
import { ImageCategory, ImageDTO } from 'services/api/types';
import { ASSETS_CATEGORIES, BoardId, IMAGE_CATEGORIES } from './gallerySlice';

export const getCategoriesQueryParamForBoard = (
  board_id: BoardId
): ImageCategory[] | undefined => {
  if (board_id === 'assets') {
    return ASSETS_CATEGORIES;
  }

  if (board_id === 'images') {
    return IMAGE_CATEGORIES;
  }

  // 'no_board' board, 'batch' board, user boards
  return undefined;
};

export const getBoardIdQueryParamForBoard = (
  board_id: BoardId
): string | null => {
  if (board_id === undefined) {
    return 'none';
  }

  // user boards
  return board_id;
};

export const getBoardIdFromBoardAndCategoriesQueryParam = (
  board_id: string | undefined,
  categories: ImageCategory[] | undefined
): BoardId => {
  if (board_id === undefined && isEqual(categories, IMAGE_CATEGORIES)) {
    return 'images';
  }

  if (board_id === undefined && isEqual(categories, ASSETS_CATEGORIES)) {
    return 'assets';
  }

  if (board_id === 'none') {
    return 'no_board';
  }

  return board_id ?? 'UNKNOWN_BOARD';
};

export const getCategories = (imageDTO: ImageDTO) => {
  if (IMAGE_CATEGORIES.includes(imageDTO.image_category)) {
    return IMAGE_CATEGORIES;
  }
  return ASSETS_CATEGORIES;
};

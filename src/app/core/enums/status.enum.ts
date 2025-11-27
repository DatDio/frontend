export enum STATUS_ENUM {
  ACTIVE = '1',
  INACTIVE = '0'
}

export const STATUS_OPTIONS = [
  { label: 'Hoạt động', value: STATUS_ENUM.ACTIVE },
  { label: 'Không hoạt động', value: STATUS_ENUM.INACTIVE }
];

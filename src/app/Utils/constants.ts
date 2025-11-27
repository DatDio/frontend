import { ACTIVE_STATUS_ENUM } from "./enums/commom.enum";

export const STATUS_OPTIONS = {
  [ACTIVE_STATUS_ENUM.ACTIVE]: {
    label: 'Hoạt động',
    class: 'bg-success'
  },
  [ACTIVE_STATUS_ENUM.IN_ACTIVE]: {
    label: 'Đã hủy',
    class: 'bg-secondary'
  }
};
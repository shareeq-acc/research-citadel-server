import { PaginationInfo } from 'src/common/types';
import { UserSelect, CompleteUserSelect } from '../queries';

export interface GetAllUserResponse {
  users: UserSelect[];
  pagination: PaginationInfo;
}

export interface CompleteUserProfileResponse {
  user: CompleteUserSelect;
}
